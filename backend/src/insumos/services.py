from typing import List
from datetime import datetime, timedelta
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions


# operaciones CRUD para Insumo


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    if not insumo.nombre or insumo.nombre.strip() == "":
        raise exceptions.NombreInsumoVacio()
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def listar_insumos(db: Session) -> List[Insumo]:
    return db.scalars(select(Insumo)).all()


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

    # Si se envían campos no nulleables como None, se descartan para no sobreescribir la BD con NULL
    campos_no_nulos = ["nombre", "lote", "fechaRecepcion", "cantRecibida", "stock", "medida"]
    for campo in campos_no_nulos:
        if campo in datos_actualizados and datos_actualizados[campo] is None:
            datos_actualizados.pop(campo)

    if "nombre" in datos_actualizados:
        nombre_val = datos_actualizados["nombre"]
        if nombre_val.strip() == "":
            raise exceptions.NombreInsumoVacio()

    # Validación de fecha de recepción si se actualiza
    if "fechaRecepcion" in datos_actualizados:
        f_rec = datos_actualizados["fechaRecepcion"]
        if f_rec > datetime.now():
            raise exceptions.FechaRecepcionInvalida()

    # Validación de fecha de vencimiento si se actualiza con un valor no nulo
    if "fechaVencimiento" in datos_actualizados and datos_actualizados["fechaVencimiento"] is not None:
        f_venc = datos_actualizados["fechaVencimiento"]
        minimo_venc = (datetime.now() + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        if f_venc < minimo_venc:
            raise exceptions.FechaVencimientoInvalida()

    # Fechas efectivas para asegurar coherencia entre ambas
    recepcion_efectiva = datos_actualizados.get("fechaRecepcion", db_insumo.fechaRecepcion)
    vencimiento_efectivo = datos_actualizados.get("fechaVencimiento") if "fechaVencimiento" in datos_actualizados else db_insumo.fechaVencimiento

    if vencimiento_efectivo is not None and vencimiento_efectivo < recepcion_efectiva:
        raise exceptions.FechaVencimientoInvalida()

    # Valores efectivos de stock y cantidad recibida
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