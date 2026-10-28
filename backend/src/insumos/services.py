from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions


# operaciones CRUD para Insumo

def obtener_insumos_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    query = select(Insumo)
    insumos = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for i in insumos:
        nombre = getattr(i, "nombre", "") or ""
        lote = getattr(i, "lote", "") or ""
        medida_val = i.medida.value if hasattr(i.medida, "value") else str(i.medida or "")

        # Filtro por término de búsqueda (nombre o lote)
        if term and (term not in nombre.lower() and term not in lote.lower()):
            continue

        # Filtro por unidad de medida
        if unidad and unidad != "TODOS":
            if medida_val.upper() != unidad.upper():
                continue

        # Calcular estado de vencimiento para filtro y reporte
        f_venc = getattr(i, "fechaVencimiento", None)
        f_rec = getattr(i, "fechaRecepcion", None)

        str_venc = f_venc.strftime("%Y-%m-%d") if isinstance(f_venc, (datetime, date)) else "No aplica"
        str_rec = f_rec.strftime("%Y-%m-%d") if isinstance(f_rec, (datetime, date)) else "No aplica"

        estado_venc = "SIN_VENCIMIENTO"
        if f_venc:
            now_dt = datetime.now()
            f_venc_dt = datetime.combine(f_venc, datetime.min.time()) if isinstance(f_venc, date) and not isinstance(f_venc, datetime) else f_venc
            dias = (f_venc_dt - now_dt).total_seconds() / (1000 * 60 * 60 * 24)
            if dias < 0:
                estado_venc = "VENCIDO"
            elif dias <= 15:
                estado_venc = "POR_VENCER"
            else:
                estado_venc = "VIGENTE"

        # Filtro por vencimiento
        if vencimiento and vencimiento != "TODOS":
            if estado_venc != vencimiento.upper():
                continue

        filas.append({
            "id": i.id,
            "nombre": nombre,
            "lote": lote,
            "stock": getattr(i, "stock", 0),
            "cantRecibida": getattr(i, "cantRecibida", 0),
            "medida": medida_val,
            "fechaRecepcion": str_rec,
            "fechaVencimiento": str_venc,
            "estadoVencimiento": estado_venc.replace("_", " ").capitalize(),
        })

    return filas

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    if not insumo.nombre or insumo.nombre.strip() == "":
        raise exceptions.NombreInsumoVacio()
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def listar_insumos(db: Session) -> List[Insumo]:
    return list(db.scalars(select(Insumo)).all())


def leer_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return db_insumo


def modificar_insumo(
    db: Session, insumo_id: int, insumo: schemas.InsumoUpdate
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    datos_actualizados = insumo.model_dump(exclude_unset=True)


    campos_no_nulos = ["nombre", "lote", "cantRecibida", "stock", "medida"]
    for campo in campos_no_nulos:
        if campo in datos_actualizados and datos_actualizados[campo] is None:
            datos_actualizados.pop(campo)

    if "nombre" in datos_actualizados:
        nombre_val = datos_actualizados["nombre"]
        if nombre_val.strip() == "":
            raise exceptions.NombreInsumoVacio()

    if "fechaVencimiento" in datos_actualizados and datos_actualizados["fechaVencimiento"] is not None:
        f_venc = datos_actualizados["fechaVencimiento"]
        minimo_venc = (datetime.now() + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        if f_venc < minimo_venc:
            raise exceptions.FechaVencimientoInvalida()
        if f_venc < db_insumo.fechaRecepcion:
            raise exceptions.FechaVencimientoInvalida()

    stock_efectivo = datos_actualizados.get("stock", db_insumo.stock)
    cant_efectiva = datos_actualizados.get("cantRecibida", db_insumo.cantRecibida)

    if stock_efectivo > cant_efectiva:
        raise exceptions.StockMayorCantidad()

    if datos_actualizados:
        db.execute(update(Insumo)
                .where(Insumo.id == insumo_id)
                .values(**datos_actualizados))
        db.commit()
        db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    db.execute(
        delete(Insumo).where(Insumo.id == insumo_id)
    )
    db.commit()
    return db_insumo

def modificar_stock(
    db: Session, insumo_id: int, datos_stock: schemas.InsumoUpdateStock
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    nuevo_stock = db_insumo.stock - datos_stock.stock
    if nuevo_stock < 0:
        raise exceptions.StockInvalido()
    db_insumo.stock = nuevo_stock
    db.commit()
    db.refresh(db_insumo)
    return db_insumo