from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session
from src.unidadesMedida import exceptions, models, schemas
from src.unidadesMedida.constants import UNIDADES_MEDIDA_BASE


def normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def clave_nombre(nombre: str) -> str:
    return normalizar_nombre(nombre).replace(" ", "").lower()


def normalizar_abreviatura(abreviatura: str) -> str:
    return "".join(abreviatura.strip().split()).upper()


def validar_unicidad(
    db: Session,
    nombre: Optional[str] = None,
    abreviatura: Optional[str] = None,
    excluir_id: Optional[int] = None,
) -> None:
    if nombre is not None:
        clave = clave_nombre(nombre)
        consulta_nombre = select(models.UnidadMedida).where(
            func.lower(func.replace(models.UnidadMedida.nombre, " ", "")) == clave
        )
        if excluir_id is not None:
            consulta_nombre = consulta_nombre.where(models.UnidadMedida.id != excluir_id)
        if db.scalar(consulta_nombre):
            raise exceptions.NombreDuplicado()

    if abreviatura is not None:
        abrev = normalizar_abreviatura(abreviatura)
        consulta_abrev = select(models.UnidadMedida).where(
            func.upper(func.replace(models.UnidadMedida.abreviatura, " ", "")) == abrev
        )
        if excluir_id is not None:
            consulta_abrev = consulta_abrev.where(models.UnidadMedida.id != excluir_id)
        if db.scalar(consulta_abrev):
            raise exceptions.AbreviaturaDuplicada()


def asegurar_unidades_base(db: Session) -> None:
    creadas = False
    for base in UNIDADES_MEDIDA_BASE:
        clave = clave_nombre(base["nombre"])
        abrev = normalizar_abreviatura(base["abreviatura"])
        existente = db.scalar(
            select(models.UnidadMedida).where(
                or_(
                    func.lower(func.replace(models.UnidadMedida.nombre, " ", "")) == clave,
                    func.upper(func.replace(models.UnidadMedida.abreviatura, " ", "")) == abrev,
                )
            )
        )
        if not existente:
            db.add(
                models.UnidadMedida(
                    nombre=base["nombre"],
                    abreviatura=abrev,
                    activo=True,
                )
            )
            creadas = True
    if creadas:
        db.commit()


def resolver_unidad_medida(
    db: Session,
    *,
    unidad_medida_id: Optional[int] = None,
    valor_texto: Optional[str] = None,
    exigir_activa: bool = True,
) -> models.UnidadMedida:
    unidad: Optional[models.UnidadMedida] = None
    if unidad_medida_id is not None:
        unidad = db.get(models.UnidadMedida, unidad_medida_id)
    elif valor_texto is not None and str(valor_texto).strip():
        texto = str(valor_texto).strip()
        clave = clave_nombre(texto)
        abrev = normalizar_abreviatura(texto)
        unidad = db.scalar(
            select(models.UnidadMedida).where(
                or_(
                    func.lower(func.replace(models.UnidadMedida.nombre, " ", "")) == clave,
                    func.upper(func.replace(models.UnidadMedida.abreviatura, " ", "")) == abrev,
                )
            )
        )
    if not unidad:
        raise exceptions.UnidadMedidaNoEncontrada()
    if exigir_activa and not unidad.activo:
        raise exceptions.UnidadMedidaInactiva()
    return unidad


def contar_referencias_unidad(db: Session, unidad_id: int) -> int:
    from src.insumos.models import Insumo
    from src.insumos_quimicos.models import InsumoQuimico
    from src.producto.models import Producto
    from src.tipoInsumo.models import TipoInsumo

    total = 0
    total += db.scalar(select(func.count(TipoInsumo.id)).where(TipoInsumo.unidad_medida_id == unidad_id)) or 0
    total += db.scalar(select(func.count(Insumo.id)).where(Insumo.unidad_medida_id == unidad_id)) or 0
    total += db.scalar(select(func.count(Producto.id)).where(Producto.unidad_medida_id == unidad_id)) or 0
    total += db.scalar(select(func.count(InsumoQuimico.id)).where(InsumoQuimico.unidad_medida_id == unidad_id)) or 0
    return total


def construir_respuesta_unidad(db: Session, unidad: models.UnidadMedida) -> schemas.UnidadMedidaResponse:
    return schemas.UnidadMedidaResponse(
        id=unidad.id,
        nombre=unidad.nombre,
        abreviatura=unidad.abreviatura,
        activo=unidad.activo,
        total_referencias=contar_referencias_unidad(db, unidad.id),
    )


def crear_unidad_medida(
    db: Session, datos: schemas.UnidadMedidaCreate
) -> schemas.UnidadMedidaResponse:
    nombre_limpio = normalizar_nombre(datos.nombre)
    abreviatura_limpia = normalizar_abreviatura(datos.abreviatura)
    validar_unicidad(db, nombre=nombre_limpio, abreviatura=abreviatura_limpia)
    unidad = models.UnidadMedida(
        nombre=nombre_limpio,
        abreviatura=abreviatura_limpia,
        activo=True,
    )
    db.add(unidad)
    db.commit()
    db.refresh(unidad)
    return construir_respuesta_unidad(db, unidad)


def listar_unidades_medida(
    db: Session, solo_activos: bool = False, busqueda: Optional[str] = None
) -> List[schemas.UnidadMedidaResponse]:
    consulta = select(models.UnidadMedida).order_by(models.UnidadMedida.nombre.asc())
    if solo_activos:
        consulta = consulta.where(models.UnidadMedida.activo == True)
    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        consulta = consulta.where(
            or_(
                models.UnidadMedida.nombre.ilike(termino),
                models.UnidadMedida.abreviatura.ilike(termino),
            )
        )
    unidades = list(db.scalars(consulta).all())
    return [construir_respuesta_unidad(db, u) for u in unidades]


def obtener_unidad_medida(db: Session, unidad_id: int) -> models.UnidadMedida:
    unidad = db.get(models.UnidadMedida, unidad_id)
    if not unidad:
        raise exceptions.UnidadMedidaNoEncontrada()
    return unidad


def actualizar_unidad_medida(
    db: Session, unidad_id: int, datos: schemas.UnidadMedidaUpdate
) -> schemas.UnidadMedidaResponse:
    unidad = obtener_unidad_medida(db, unidad_id)
    datos_dict = datos.model_dump(exclude_unset=True)
    if "nombre" in datos_dict and datos_dict["nombre"] is not None:
        nombre_limpio = normalizar_nombre(datos_dict["nombre"])
        validar_unicidad(db, nombre=nombre_limpio, excluir_id=unidad_id)
        unidad.nombre = nombre_limpio
    if "abreviatura" in datos_dict and datos_dict["abreviatura"] is not None:
        abreviatura_limpia = normalizar_abreviatura(datos_dict["abreviatura"])
        validar_unicidad(db, abreviatura=abreviatura_limpia, excluir_id=unidad_id)
        unidad.abreviatura = abreviatura_limpia
    if "activo" in datos_dict and datos_dict["activo"] is not None:
        unidad.activo = datos_dict["activo"]
    db.commit()
    db.refresh(unidad)
    return construir_respuesta_unidad(db, unidad)


def eliminar_unidad_medida(
    db: Session, unidad_id: int, baja_logica: bool = True
) -> schemas.UnidadMedidaResponse:
    unidad = obtener_unidad_medida(db, unidad_id)
    if contar_referencias_unidad(db, unidad_id) > 0:
        raise exceptions.UnidadMedidaEnUso()
    if baja_logica:
        unidad.activo = False
        db.commit()
        db.refresh(unidad)
        return construir_respuesta_unidad(db, unidad)
    respuesta = construir_respuesta_unidad(db, unidad)
    db.execute(delete(models.UnidadMedida).where(models.UnidadMedida.id == unidad_id))
    db.commit()
    return respuesta


def restaurar_unidad_medida(db: Session, unidad_id: int) -> schemas.UnidadMedidaResponse:
    unidad = obtener_unidad_medida(db, unidad_id)
    validar_unicidad(
        db,
        nombre=unidad.nombre,
        abreviatura=unidad.abreviatura,
        excluir_id=unidad_id,
    )
    unidad.activo = True
    db.commit()
    db.refresh(unidad)
    return construir_respuesta_unidad(db, unidad)


def obtener_unidades_para_csv(
    db: Session, busqueda: Optional[str] = None, solo_activos: bool = False
) -> List[Dict[str, Any]]:
    unidades = listar_unidades_medida(db, solo_activos=solo_activos, busqueda=busqueda)
    return [
        {
            "id": u.id,
            "nombre": u.nombre,
            "abreviatura": u.abreviatura,
            "totalReferencias": u.total_referencias,
            "estado": "Activo" if u.activo else "Inactivo",
        }
        for u in unidades
    ]
