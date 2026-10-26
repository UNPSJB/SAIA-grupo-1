from typing import List
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions


# operaciones CRUD para Insumo
# La baja es logica (activo = False): los insumos dados de baja no se listan ni se pueden leer,
# pero siguen existiendo para los lotes de produccion que los usaron.


def _validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    """El nombre no puede repetirse (sin distinguir mayusculas) entre los insumos activos."""
    consulta = select(Insumo.id).where(
        Insumo.activo, func.lower(Insumo.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        consulta = consulta.where(Insumo.id != excluir_id)
    if db.scalar(consulta) is not None:
        raise exceptions.NombreInsumoDuplicado()


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    if not insumo.nombre or insumo.nombre.strip() == "":
        raise exceptions.NombreInsumoVacio()
    _validar_nombre_unico(db, insumo.nombre)
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def listar_insumos(db: Session) -> List[Insumo]:
    return list(db.scalars(select(Insumo).where(Insumo.activo)).all())


def leer_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id, Insumo.activo))
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
        _validar_nombre_unico(db, nombre_val, excluir_id=insumo_id)

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
    db_insumo.activo = False
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