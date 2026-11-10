from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from src.tipoInsumo import exceptions, models, schemas


def normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def clave_comparacion(nombre: str) -> str:
    return normalizar_nombre(nombre).replace(" ", "").lower()


def validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    clave = clave_comparacion(nombre)
    consulta = select(models.TipoInsumo).where(
        func.lower(func.replace(models.TipoInsumo.nombre, " ", "")) == clave
    )
    if excluir_id is not None:
        consulta = consulta.where(models.TipoInsumo.id != excluir_id)
    existente = db.scalar(consulta)
    if existente:
        raise exceptions.NombreDuplicado()


def calcular_estado_vencimiento(fecha_vencimiento: Optional[datetime | date], stock: float) -> str:
    if stock <= 0:
        return "AGOTADO"
    if not fecha_vencimiento:
        return "SIN_VENCIMIENTO"
    f_date = fecha_vencimiento.date() if isinstance(fecha_vencimiento, datetime) else fecha_vencimiento
    hoy = date.today()
    dias = (f_date - hoy).days
    if dias < 0:
        return "VENCIDO"
    if dias <= 7:
        return "PROXIMO_A_VENCER"
    return "VIGENTE"


def crear_tipo_insumo(db: Session, datos: schemas.TipoInsumoCreate) -> models.TipoInsumo:
    nombre_normalizado = normalizar_nombre(datos.nombre)
    validar_nombre_unico(db, nombre_normalizado)
    tipo = models.TipoInsumo(
        nombre=nombre_normalizado,
        descripcion=datos.descripcion,
        unidadMedida=datos.unidadMedida,
        activo=True,
    )
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


def listar_tipos_insumos(
    db: Session, solo_activos: bool = False, busqueda: Optional[str] = None
) -> List[schemas.TipoInsumo]:
    from src.insumos.models import Insumo
    consulta = select(models.TipoInsumo).order_by(models.TipoInsumo.nombre.asc())
    if solo_activos:
        consulta = consulta.where(models.TipoInsumo.activo == True)
    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        consulta = consulta.where(models.TipoInsumo.nombre.ilike(termino))
    tipos = list(db.scalars(consulta).all())
    resultado: List[schemas.TipoInsumo] = []
    for t in tipos:
        totales = db.execute(
            select(
                func.count(Insumo.id),
                func.coalesce(func.sum(Insumo.stock), 0.0),
            ).where(Insumo.tipo_insumo_id == t.id, Insumo.activo == True)
        ).first()
        total_lotes = totales[0] if totales else 0
        stock_total = float(totales[1]) if totales else 0.0
        resultado.append(
            schemas.TipoInsumo(
                id=t.id,
                nombre=t.nombre,
                descripcion=t.descripcion,
                unidadMedida=t.unidadMedida,
                activo=t.activo,
                total_lotes=total_lotes,
                stock_total=stock_total,
            )
        )
    return resultado


def obtener_tipo_insumo(db: Session, tipo_id: int) -> models.TipoInsumo:
    tipo = db.get(models.TipoInsumo, tipo_id)
    if not tipo:
        raise exceptions.TipoInsumoNoEncontrado()
    return tipo


def obtener_tipo_insumo_detalle(db: Session, tipo_id: int) -> schemas.TipoInsumoDetalle:
    from src.insumos.models import Insumo
    tipo = obtener_tipo_insumo(db, tipo_id)
    lotes_db = list(
        db.scalars(
            select(Insumo)
            .where(Insumo.tipo_insumo_id == tipo_id)
            .order_by(Insumo.fechaRecepcion.desc(), Insumo.id.desc())
        ).all()
    )
    lotes_historicos: List[schemas.LoteInsumoHistorico] = []
    stock_total = 0.0
    for l in lotes_db:
        if l.activo:
            stock_total += float(l.stock)
        estado_v = calcular_estado_vencimiento(l.fechaVencimiento, l.stock)
        prov_nombre = l.proveedor.nombre if getattr(l, "proveedor", None) else None
        lotes_historicos.append(
            schemas.LoteInsumoHistorico(
                id=l.id,
                lote=l.lote,
                nombre=l.nombre,
                stock=float(l.stock),
                cantRecibida=float(l.cantRecibida),
                medida=str(l.medida.value if hasattr(l.medida, "value") else l.medida),
                fechaRecepcion=l.fechaRecepcion,
                fechaVencimiento=l.fechaVencimiento,
                proveedor_id=l.proveedor_id,
                proveedor_nombre=prov_nombre,
                estadoVencimiento=estado_v,
                activo=l.activo,
            )
        )
    return schemas.TipoInsumoDetalle(
        id=tipo.id,
        nombre=tipo.nombre,
        descripcion=tipo.descripcion,
        unidadMedida=tipo.unidadMedida,
        activo=tipo.activo,
        total_lotes=len(lotes_historicos),
        stock_total=stock_total,
        lotes=lotes_historicos,
    )


def actualizar_tipo_insumo(
    db: Session, tipo_id: int, datos: schemas.TipoInsumoUpdate
) -> models.TipoInsumo:
    tipo = obtener_tipo_insumo(db, tipo_id)
    datos_dict = datos.model_dump(exclude_unset=True)
    if "nombre" in datos_dict and datos_dict["nombre"] is not None:
        nombre_normalizado = normalizar_nombre(datos_dict["nombre"])
        validar_nombre_unico(db, nombre_normalizado, excluir_id=tipo_id)
        tipo.nombre = nombre_normalizado
    if "descripcion" in datos_dict:
        tipo.descripcion = datos_dict["descripcion"]
    if "unidadMedida" in datos_dict and datos_dict["unidadMedida"] is not None:
        tipo.unidadMedida = datos_dict["unidadMedida"]
    if "activo" in datos_dict and datos_dict["activo"] is not None:
        tipo.activo = datos_dict["activo"]
    db.commit()
    db.refresh(tipo)
    return tipo


def eliminar_tipo_insumo(db: Session, tipo_id: int, baja_logica: bool = True) -> models.TipoInsumo:
    from src.insumos.models import Insumo
    tipo = obtener_tipo_insumo(db, tipo_id)
    cant_insumos = db.scalar(
        select(func.count(Insumo.id)).where(Insumo.tipo_insumo_id == tipo_id)
    )
    if cant_insumos and cant_insumos > 0:
        raise exceptions.TipoInsumoEnUso()
    if baja_logica:
        tipo.activo = False
        db.commit()
        db.refresh(tipo)
        return tipo
    db.execute(delete(models.TipoInsumo).where(models.TipoInsumo.id == tipo_id))
    db.commit()
    return tipo


def obtener_tipos_insumos_para_csv(
    db: Session, busqueda: Optional[str] = None, solo_activos: bool = False
) -> List[Dict[str, Any]]:
    tipos = listar_tipos_insumos(db, solo_activos=solo_activos, busqueda=busqueda)
    return [
        {
            "id": t.id,
            "nombre": t.nombre,
            "descripcion": t.descripcion or "-",
            "unidadMedida": t.unidadMedida.value if hasattr(t.unidadMedida, "value") else str(t.unidadMedida),
            "stockTotal": t.stock_total,
            "totalLotes": t.total_lotes,
            "estado": "Activo" if t.activo else "Inactivo",
        }
        for t in tipos
    ]
