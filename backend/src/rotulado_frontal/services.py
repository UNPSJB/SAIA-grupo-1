from datetime import date, datetime
from typing import Iterable, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.producto import exceptions as producto_exceptions
from src.producto.services import obtener_producto
from src.rotulado_frontal import exceptions, motor, schemas
from src.rotulado_frontal.constants import (
    CLAVE_MODULO_OCTOGONOS, PARAMETROS_INICIALES, EstadoConjunto, EstadoFisico,
)
from src.rotulado_frontal.models import (
    CalculoRotulado, ConjuntoParametrosRotulado, EstadoModulo, ParametrosSellos, ReglaRotulado,
)

UNIDADES_SOLIDAS = {
    "g",
    "gr",
    "kg",
    "gramo",
    "gramos",
    "kilogramo",
    "kilogramos",
}
UNIDADES_LIQUIDAS = {
    "ml",
    "l",
    "mililitro",
    "mililitros",
    "litro",
    "litros",
    "cm3",
    "cc",
}


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
    unidad = str(getattr(producto, "unidadMedida", "") or "").strip()
    if not unidad and getattr(producto, "unidad_medida_rel", None):
        unidad = str(producto.unidad_medida_rel.nombre or "").strip()
    if unidad in UNIDADES_SOLIDAS or unidad.lower() in UNIDADES_SOLIDAS:
        return EstadoFisico.SOLIDO
    if unidad in UNIDADES_LIQUIDAS or unidad.lower() in UNIDADES_LIQUIDAS:
        return EstadoFisico.LIQUIDO
    raise exceptions.EstadoFisicoIndeterminado()


def asegurar_parametros_sellos_defecto(db: Session) -> ParametrosSellos:
    param = db.scalar(
        select(ParametrosSellos)
        .where(ParametrosSellos.activa == True)
        .order_by(ParametrosSellos.fecha_vigencia.desc())
    )
    if param is None:
        param = ParametrosSellos(
            version="Decreto 151/2022 - Disp. ANMAT 11362/24",
            fecha_vigencia=date(2024, 12, 1),
            activa=True,
            norma_origen="Ley 27.642, Decreto 151/2022 y Disp. ANMAT 11362/24",
            umbral_azucares_pct=10.0,
            umbral_grasas_totales_pct=30.0,
            umbral_grasas_saturadas_pct=10.0,
            umbral_sodio_mg_por_kcal=1.0,
            umbral_sodio_max_100g=300.0,
            umbral_sodio_bebida_sin_kcal=40.0,
            umbral_calorias_solido_100g=275.0,
            umbral_calorias_liquido_100ml=25.0,
            factor_kcal_carbohidratos=4.0,
            factor_kcal_grasas=9.0,
        )
        db.add(param)
        db.commit()
        db.refresh(param)
    return param


def obtener_parametros_sellos_vigentes(db: Session, fecha: Optional[date] = None) -> ParametrosSellos:
    fecha = fecha or date.today()
    param = db.scalar(
        select(ParametrosSellos)
        .where(
            ParametrosSellos.activa == True,
            ParametrosSellos.fecha_vigencia <= fecha,
        )
        .order_by(ParametrosSellos.fecha_vigencia.desc())
        .limit(1)
    )
    if param is None:
        param = db.scalar(
            select(ParametrosSellos)
            .where(ParametrosSellos.activa == True)
            .order_by(ParametrosSellos.fecha_vigencia.desc())
            .limit(1)
        )
    if param is None:
        param = asegurar_parametros_sellos_defecto(db)
    return param


def detectar_agregados_producto(db: Session, producto_id: int) -> dict:
    from src.producto.models import Producto
    from src.recetas.models import RecetaDetalle
    from src.insumos.models import Insumo

    prod = db.get(Producto, producto_id)
    receta_obj = None
    if prod and getattr(prod, "receta", None):
        receta_obj = prod.receta[0] if isinstance(prod.receta, list) else prod.receta
    if not prod or not receta_obj:
        return {
            "azucares": True, "detalle_azucares": "Sin receta asociada",
            "grasas": True, "detalle_grasas": "Sin receta asociada",
            "sodio": True, "detalle_sodio": "Sin receta asociada",
        }

    version = receta_obj.version_actual
    if not version:
        return {
            "azucares": True, "detalle_azucares": "Sin receta vigente",
            "grasas": True, "detalle_grasas": "Sin receta vigente",
            "sodio": True, "detalle_sodio": "Sin receta vigente",
        }

    detalles = db.scalars(
        select(RecetaDetalle).where(RecetaDetalle.version_receta_id == version.id)
    ).all()

    azucares_nombres = []
    grasas_nombres = []
    sodio_nombres = []

    PALABRAS_AZUCAR = (
        "azucar", "azúcar", "miel", "jarabe", "glucosa", "fructosa",
        "sacarosa", "dextrosa", "dulce", "mermelada", "caramelo", "jugo", "pulpa"
    )
    PALABRAS_GRASA = (
        "aceite", "manteca", "grasa", "crema", "margarina", "shortening",
        "cacao", "chocolate"
    )

    for det in detalles:
        det_ing_id = getattr(det, "ingrediente_id", None)
        ins = db.get(Insumo, det_ing_id) if det_ing_id else None
        fuente_nut = ins or det.tipo_insumo or det.aditivo
        nombre_crudo = ins.nombre if ins else (det.nombre_ingrediente or "")
        nombre = nombre_crudo.lower()

        if "agua" in nombre:
            continue

        if any(p in nombre for p in PALABRAS_AZUCAR) or (fuente_nut and (getattr(fuente_nut, "azucares_anadidos", None) or 0.0) > 0.0):
            azucares_nombres.append(nombre_crudo)

        if any(p in nombre for p in PALABRAS_GRASA) or (fuente_nut and (getattr(fuente_nut, "grasas_totales", None) or 0.0) > 1.0):
            grasas_nombres.append(nombre_crudo)

        if "sal" in nombre:
            sodio_nombres.append(nombre_crudo)
        elif det.es_aditivo and ("sodio" in nombre or "bicarbonato" in nombre or (det.numero_ins and "500" in det.numero_ins)):
            sodio_nombres.append(f"{nombre_crudo} ({det.numero_ins})" if det.numero_ins else nombre_crudo)
        elif fuente_nut and (getattr(fuente_nut, "sodio_mg", None) or 0.0) > 50.0 and det.es_aditivo:
            sodio_nombres.append(nombre_crudo)

    tiene_azucares = len(azucares_nombres) > 0
    tiene_grasas = len(grasas_nombres) > 0
    tiene_sodio = len(sodio_nombres) > 0

    return {
        "azucares": tiene_azucares,
        "detalle_azucares": ", ".join(dict.fromkeys(azucares_nombres)) if tiene_azucares else "No",
        "grasas": tiene_grasas,
        "detalle_grasas": ", ".join(dict.fromkeys(grasas_nombres)) if tiene_grasas else "No",
        "sodio": tiene_sodio,
        "detalle_sodio": ", ".join(dict.fromkeys(sodio_nombres)) if tiene_sodio else "No",
    }


def evaluar(db: Session, datos: schemas.EvaluacionIn) -> schemas.EvaluacionOut:
    conjunto = _obtener(db, datos.conjunto_id) if datos.conjunto_id else obtener_vigente(db)
    sellos, detalle = motor.evaluar(
        _reglas_para_motor(conjunto), datos.valores.model_dump(), datos.estado_fisico,
    )
    parametros_sellos = obtener_parametros_sellos_vigentes(db)
    _, pasos = motor.evaluar_con_parametros_y_agregados(
        parametros_sellos, datos.valores.model_dump(), datos.estado_fisico
    )
    return schemas.EvaluacionOut(
        conjunto_parametros_id=conjunto.id,
        version_parametros=conjunto.version,
        sellos=sellos,
        detalle=detalle,
        pasos=pasos,
    )


def calcular_rotulado(
    db: Session, producto_id: int, datos: schemas.CalculoIn, usuario=None, fecha: Optional[date] = None,
) -> CalculoRotulado:
    producto = obtener_producto(db, producto_id)
    if not producto.activo:
        raise producto_exceptions.ProductoInactivo()

    if not producto.aplica_rotulado:
        raise exceptions.ProductoNoAplicaRotulado()

    estado_fisico = resolver_estado_fisico(producto, datos.estado_fisico)
    conjunto = obtener_vigente(db, fecha)
    valores = datos.valores.model_dump()
    sellos, detalle = motor.evaluar(_reglas_para_motor(conjunto), valores, estado_fisico)

    parametros_sellos = obtener_parametros_sellos_vigentes(db, fecha)
    agregados = detectar_agregados_producto(db, producto_id)
    sellos_oficiales, pasos = motor.evaluar_con_parametros_y_agregados(
        parametros_sellos, valores, estado_fisico, agregados
    )

    calculo = CalculoRotulado(
        producto_id=producto.id,
        conjunto_parametros_id=conjunto.id,
        version_parametros=conjunto.version,
        estado_fisico=estado_fisico,
        valores_entrada=valores,
        sellos=sellos,
        resultado=[d.model_dump(mode="json") for d in detalle],
        pasos=[p.model_dump(mode="json") for p in pasos],
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


def calcular_desde_nutricion_producto(
    db: Session, producto_id: int, usuario=None, fecha: Optional[date] = None
) -> CalculoRotulado:
    from src.nutricion.models import InformacionNutricionalProducto
    producto = obtener_producto(db, producto_id)
    if not producto.activo:
        raise producto_exceptions.ProductoInactivo()

    info = db.scalar(
        select(InformacionNutricionalProducto).where(
            InformacionNutricionalProducto.producto_id == producto_id
        )
    )
    if info is None:
        try:
            from src.nutricion.services import calcular_informacion_nutricional
            calcular_informacion_nutricional(db, producto_id)
            info = db.scalar(
                select(InformacionNutricionalProducto).where(
                    InformacionNutricionalProducto.producto_id == producto_id
                )
            )
        except Exception:
            pass

    if info is None:
        raise exceptions.NutricionNoCalculada()

    valores = schemas.ValoresNutricionales100(
        energia_kcal=float(info.energia_kcal_100g or 0.0),
        azucares_anadidos=float(info.azucares_anadidos_100g or 0.0),
        grasas_totales=float(info.grasas_totales_100g or 0.0),
        grasas_saturadas=float(info.grasas_saturadas_100g or 0.0),
        sodio_mg=float(info.sodio_mg_100g or 0.0),
    )
    try:
        estado_resuelto = resolver_estado_fisico(producto, None)
    except exceptions.EstadoFisicoIndeterminado:
        estado_resuelto = EstadoFisico.SOLIDO

    return calcular_rotulado(
        db,
        producto_id,
        schemas.CalculoIn(valores=valores, estado_fisico=estado_resuelto),
        usuario=usuario,
        fecha=fecha,
    )


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
    estado = obtener_estado_modulo(db, clave)
    estado.activo = activo
    estado.actualizado_en = datetime.now()
    estado.actualizado_por_legajo = _legajo(usuario)
    db.commit()
    db.refresh(estado)
    return estado


def asegurar_datos_iniciales(db: Session) -> None:
    obtener_estado_modulo(db)
    asegurar_parametros_sellos_defecto(db)

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
