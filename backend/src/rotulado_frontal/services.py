from datetime import date, datetime
from typing import Iterable, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.producto import exceptions as producto_exceptions
from src.producto.models import UnidadMedida
from src.producto.services import obtener_producto
from src.rotulado_frontal import exceptions, motor, schemas
from src.rotulado_frontal.constants import (
    CLAVE_MODULO_OCTOGONOS, PARAMETROS_INICIALES, EstadoConjunto, EstadoFisico,
)
from src.rotulado_frontal.models import (
    CalculoRotulado, ConjuntoParametrosRotulado, EstadoModulo, ReglaRotulado,
)

UNIDADES_SOLIDAS = {UnidadMedida.GRAMOS, UnidadMedida.KILOGRAMOS}
UNIDADES_LIQUIDAS = {UnidadMedida.MILILITROS, UnidadMedida.LITROS}


# --- Auxiliares ---

def _legajo(usuario) -> Optional[int]:
    return getattr(usuario, "legajo", None)


def _reglas_desde_schema(reglas: Iterable[schemas.ReglaIn]) -> List[ReglaRotulado]:
    return [
        ReglaRotulado(
            codigo=r.codigo,
            leyenda=r.leyenda,
            condiciones=[c.model_dump(mode="json") for c in r.condiciones],
            aplicabilidad=[a.model_dump(mode="json") for a in r.aplicabilidad],
            orden=r.orden,
            activa=r.activa,
        )
        for r in reglas
    ]


def _reglas_para_motor(conjunto: ConjuntoParametrosRotulado) -> List[schemas.ReglaIn]:
    return [schemas.ReglaIn.model_validate(r, from_attributes=True) for r in conjunto.reglas]


def _validar_version_unica(db: Session, version: str, excluir_id: Optional[int] = None) -> None:
    consulta = select(ConjuntoParametrosRotulado.id).where(ConjuntoParametrosRotulado.version == version)
    if excluir_id is not None:
        consulta = consulta.where(ConjuntoParametrosRotulado.id != excluir_id)
    if db.scalar(consulta) is not None:
        raise exceptions.VersionDuplicada()


def _validar_borrador(conjunto: ConjuntoParametrosRotulado) -> None:
    if conjunto.estado != EstadoConjunto.BORRADOR:
        raise exceptions.ConjuntoPublicadoInmutable()


def _vigente_o_none(db: Session, fecha: date) -> Optional[ConjuntoParametrosRotulado]:
    return db.scalar(
        select(ConjuntoParametrosRotulado)
        .where(
            ConjuntoParametrosRotulado.estado == EstadoConjunto.PUBLICADO,
            ConjuntoParametrosRotulado.fecha_vigencia <= fecha,
        )
        .order_by(ConjuntoParametrosRotulado.fecha_vigencia.desc())
        .limit(1)
    )


def _anotar(db: Session, conjuntos: List[ConjuntoParametrosRotulado]) -> List[ConjuntoParametrosRotulado]:
    """Agrega es_vigente y cantidad_calculos (no son columnas) para la respuesta."""
    vigente = _vigente_o_none(db, date.today())
    conteos = dict(db.execute(
        select(CalculoRotulado.conjunto_parametros_id, func.count(CalculoRotulado.id))
        .group_by(CalculoRotulado.conjunto_parametros_id)
    ).all())
    for conjunto in conjuntos:
        conjunto.es_vigente = vigente is not None and conjunto.id == vigente.id
        conjunto.cantidad_calculos = conteos.get(conjunto.id, 0)
    return conjuntos


def _obtener(db: Session, conjunto_id: int) -> ConjuntoParametrosRotulado:
    conjunto = db.get(ConjuntoParametrosRotulado, conjunto_id)
    if conjunto is None:
        raise exceptions.ConjuntoNoEncontrado()
    return conjunto


# --- Conjuntos de parametros ---

def listar_conjuntos(db: Session, estado: Optional[EstadoConjunto] = None) -> List[ConjuntoParametrosRotulado]:
    consulta = select(ConjuntoParametrosRotulado).order_by(
        ConjuntoParametrosRotulado.fecha_vigencia.desc(), ConjuntoParametrosRotulado.id.desc()
    )
    if estado is not None:
        consulta = consulta.where(ConjuntoParametrosRotulado.estado == estado)
    return _anotar(db, list(db.scalars(consulta).all()))


def obtener_conjunto(db: Session, conjunto_id: int) -> ConjuntoParametrosRotulado:
    return _anotar(db, [_obtener(db, conjunto_id)])[0]


def obtener_vigente(db: Session, fecha: Optional[date] = None) -> ConjuntoParametrosRotulado:
    conjunto = _vigente_o_none(db, fecha or date.today())
    if conjunto is None:
        raise exceptions.SinParametrosVigentes()
    return _anotar(db, [conjunto])[0]


def crear_conjunto(db: Session, datos: schemas.ConjuntoCreate, usuario=None) -> ConjuntoParametrosRotulado:
    _validar_version_unica(db, datos.version)
    conjunto = ConjuntoParametrosRotulado(
        version=datos.version,
        fecha_vigencia=datos.fecha_vigencia,
        norma_origen=datos.norma_origen,
        descripcion=datos.descripcion,
        estado=EstadoConjunto.BORRADOR,
        creado_por_legajo=_legajo(usuario),
        reglas=_reglas_desde_schema(datos.reglas),
    )
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return obtener_conjunto(db, conjunto.id)


def nueva_version(
    db: Session, origen_id: int, datos: schemas.NuevaVersionIn, usuario=None,
) -> ConjuntoParametrosRotulado:
    """Crea un borrador copiando las reglas de otro conjunto (publicado o no)."""
    origen = _obtener(db, origen_id)
    _validar_version_unica(db, datos.version)
    conjunto = ConjuntoParametrosRotulado(
        version=datos.version,
        fecha_vigencia=datos.fecha_vigencia,
        norma_origen=datos.norma_origen,
        descripcion=datos.descripcion,
        estado=EstadoConjunto.BORRADOR,
        basado_en_id=origen.id,
        creado_por_legajo=_legajo(usuario),
        reglas=_reglas_desde_schema(_reglas_para_motor(origen)),
    )
    db.add(conjunto)
    db.commit()
    db.refresh(conjunto)
    return obtener_conjunto(db, conjunto.id)


def actualizar_borrador(
    db: Session, conjunto_id: int, datos: schemas.ConjuntoUpdate,
) -> ConjuntoParametrosRotulado:
    conjunto = _obtener(db, conjunto_id)
    _validar_borrador(conjunto)
    _validar_version_unica(db, datos.version, excluir_id=conjunto.id)

    conjunto.version = datos.version
    conjunto.fecha_vigencia = datos.fecha_vigencia
    conjunto.norma_origen = datos.norma_origen
    conjunto.descripcion = datos.descripcion
    # se borran las reglas anteriores antes de insertar las nuevas para no chocar con el codigo unico
    conjunto.reglas.clear()
    db.flush()
    conjunto.reglas.extend(_reglas_desde_schema(datos.reglas))
    db.commit()
    return obtener_conjunto(db, conjunto.id)


def eliminar_borrador(db: Session, conjunto_id: int) -> None:
    conjunto = _obtener(db, conjunto_id)
    _validar_borrador(conjunto)
    db.delete(conjunto)
    db.commit()


def publicar(db: Session, conjunto_id: int) -> ConjuntoParametrosRotulado:
    conjunto = _obtener(db, conjunto_id)
    _validar_borrador(conjunto)

    if not any(r.activa for r in conjunto.reglas):
        raise exceptions.ConjuntoSinReglas()

    # la linea de tiempo solo avanza: lo que estuvo vigente en una fecha pasada no cambia
    ultima_fecha = db.scalar(
        select(func.max(ConjuntoParametrosRotulado.fecha_vigencia))
        .where(ConjuntoParametrosRotulado.estado == EstadoConjunto.PUBLICADO)
    )
    if ultima_fecha is not None and conjunto.fecha_vigencia <= ultima_fecha:
        raise exceptions.FechaVigenciaNoPosterior()

    conjunto.estado = EstadoConjunto.PUBLICADO
    conjunto.publicado_en = datetime.now()
    db.commit()
    return obtener_conjunto(db, conjunto.id)


# --- Calculo ---

def resolver_estado_fisico(producto, explicito: Optional[EstadoFisico]) -> EstadoFisico:
    if explicito is not None:
        return explicito
    if producto.unidadMedida in UNIDADES_SOLIDAS:
        return EstadoFisico.SOLIDO
    if producto.unidadMedida in UNIDADES_LIQUIDAS:
        return EstadoFisico.LIQUIDO
    raise exceptions.EstadoFisicoIndeterminado()


def evaluar(db: Session, datos: schemas.EvaluacionIn) -> schemas.EvaluacionOut:
    """Simula sin guardar nada; sirve para probar un borrador antes de publicarlo."""
    conjunto = _obtener(db, datos.conjunto_id) if datos.conjunto_id else obtener_vigente(db)
    sellos, detalle = motor.evaluar(
        _reglas_para_motor(conjunto), datos.valores.model_dump(), datos.estado_fisico,
    )
    return schemas.EvaluacionOut(
        conjunto_parametros_id=conjunto.id,
        version_parametros=conjunto.version,
        sellos=sellos,
        detalle=detalle,
    )


def calcular_rotulado(
    db: Session, producto_id: int, datos: schemas.CalculoIn, usuario=None, fecha: Optional[date] = None,
) -> CalculoRotulado:
    """Aplica los parametros vigentes y guarda el resultado como un calculo nuevo.
    Recalcular nunca modifica los calculos anteriores."""
    producto = obtener_producto(db, producto_id)
    if not producto.activo:
        raise producto_exceptions.ProductoInactivo()

    estado_fisico = resolver_estado_fisico(producto, datos.estado_fisico)
    conjunto = obtener_vigente(db, fecha)
    valores = datos.valores.model_dump()
    sellos, detalle = motor.evaluar(_reglas_para_motor(conjunto), valores, estado_fisico)

    calculo = CalculoRotulado(
        producto_id=producto.id,
        conjunto_parametros_id=conjunto.id,
        version_parametros=conjunto.version,
        estado_fisico=estado_fisico,
        valores_entrada=valores,
        sellos=sellos,
        resultado=[d.model_dump(mode="json") for d in detalle],
        calculado_por_legajo=_legajo(usuario),
    )
    db.add(calculo)
    db.commit()
    db.refresh(calculo)
    return calculo


def listar_calculos(db: Session, producto_id: int) -> List[CalculoRotulado]:
    obtener_producto(db, producto_id)
    return list(db.scalars(
        select(CalculoRotulado)
        .where(CalculoRotulado.producto_id == producto_id)
        .order_by(CalculoRotulado.calculado_en.desc(), CalculoRotulado.id.desc())
    ).all())


def ultimo_calculo(db: Session, producto_id: int) -> Optional[CalculoRotulado]:
    calculos = listar_calculos(db, producto_id)
    return calculos[0] if calculos else None


# --- Interruptor del modulo ---

def obtener_estado_modulo(db: Session, clave: str = CLAVE_MODULO_OCTOGONOS) -> EstadoModulo:
    estado = db.get(EstadoModulo, clave)
    if estado is None:
        estado = EstadoModulo(clave=clave, activo=True)
        db.add(estado)
        db.commit()
        db.refresh(estado)
    return estado


def modulo_activo(db: Session, clave: str = CLAVE_MODULO_OCTOGONOS) -> bool:
    estado = db.get(EstadoModulo, clave)
    return True if estado is None else estado.activo


def cambiar_estado_modulo(
    db: Session, activo: bool, usuario=None, clave: str = CLAVE_MODULO_OCTOGONOS,
) -> EstadoModulo:
    """Solo prende o apaga el modulo: no borra parametros ni calculos."""
    estado = obtener_estado_modulo(db, clave)
    estado.activo = activo
    estado.actualizado_en = datetime.now()
    estado.actualizado_por_legajo = _legajo(usuario)
    db.commit()
    db.refresh(estado)
    return estado


# --- Datos iniciales ---

def asegurar_datos_iniciales(db: Session) -> None:
    """Crea el interruptor del modulo y, si no hay ningun conjunto, el inicial publicado.
    Es idempotente: se puede llamar en cada arranque."""
    obtener_estado_modulo(db)

    if db.scalar(select(func.count(ConjuntoParametrosRotulado.id))):
        return

    datos = schemas.ConjuntoCreate.model_validate(PARAMETROS_INICIALES)
    conjunto = ConjuntoParametrosRotulado(
        version=datos.version,
        fecha_vigencia=datos.fecha_vigencia,
        norma_origen=datos.norma_origen,
        descripcion=datos.descripcion,
        estado=EstadoConjunto.BORRADOR,
        reglas=_reglas_desde_schema(datos.reglas),
    )
    db.add(conjunto)
    db.flush()
    # se publica en un segundo paso, igual que cualquier conjunto
    conjunto.estado = EstadoConjunto.PUBLICADO
    conjunto.publicado_en = datetime.now()
    db.commit()
