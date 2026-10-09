from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.sectores.models import Sector
from src.sectores import schemas, exceptions

def crear_sector(db: Session, sector: schemas.SectorCreate) -> Sector:
    existente = db.scalar(select(Sector).where(Sector.nombre == sector.nombre))
    if existente is not None:
        raise exceptions.NombreDuplicado()
    nuevo = Sector(nombre=sector.nombre)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

def listar_sectores(db: Session) -> List[Sector]:
    return list(db.scalars(select(Sector).order_by(Sector.nombre)).all())

def obtener_sector(db: Session, sector_id: int) -> Sector:
    sector = db.scalar(select(Sector).where(Sector.id == sector_id))
    if sector is None:
        raise exceptions.SectorNoEncontrado()
    return sector

def editar_sector(db: Session, sector_id: int, sector: schemas.SectorUpdate) -> Sector:
    db_sector = obtener_sector(db, sector_id)
    datos = sector.model_dump(exclude_unset=True)
    if "nombre" in datos and datos["nombre"] is not None:
        nuevo_nombre = datos["nombre"]
        duplicado = db.scalar(
            select(Sector).where(Sector.nombre == nuevo_nombre, Sector.id != sector_id)
        )
        if duplicado is not None:
            raise exceptions.NombreDuplicado()
        db_sector.nombre = nuevo_nombre
        db.commit()
        db.refresh(db_sector)
    return db_sector

def eliminar_sector(db: Session, sector_id: int) -> Sector:
    sector = obtener_sector(db, sector_id)
    if sector.equipos or sector.plan_de_limpieza is not None:
        raise exceptions.SectorEnUso()
    db.delete(sector)
    db.commit()
    return sector

