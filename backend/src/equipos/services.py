import logging
from typing import List, Literal, Optional
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.equipos.models import Equipo, Estado
from src.equipos import schemas, exceptions
from src.sectores.models import Sector
from src.sectores.exceptions import SectorNoEncontrado

def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> schemas.Equipo:
    datos = equipo.model_dump()
    datos.pop("ubicacion_id", None)
    sector_id = datos.get("sector_id")
    ubicacion_val = datos.pop("ubicacion", None)
    if sector_id is None and isinstance(ubicacion_val, str) and ubicacion_val.strip():
        sector = db.scalar(select(Sector).where(Sector.nombre == ubicacion_val.strip()))
        if sector is None:
            sector = Sector(nombre=ubicacion_val.strip())
            db.add(sector)
            db.flush()
        sector_id = sector.id
    if sector_id is None:
        raise exceptions.CadenaMayorOigualACUATRO()
    sector_obj = db.scalar(select(Sector).where(Sector.id == sector_id))
    if sector_obj is None:
        raise SectorNoEncontrado()
    datos["sector_id"] = sector_id
    _equipo = Equipo(**datos)
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(db: Session, estado: Optional[Estado] = None) -> List[schemas.Equipo]:
    query = select(Equipo)
    if estado is not None:
        query = query.where(Equipo.estado == estado)
    return list(db.scalars(query).all())

def obtener_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return db_equipo

def editar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    datos = equipo.model_dump(exclude_unset=True)
    datos.pop("ubicacion_id", None)
    ubicacion_val = datos.pop("ubicacion", None)
    if "sector_id" in datos and datos["sector_id"] is not None:
        sector_id = datos["sector_id"]
    elif isinstance(ubicacion_val, str) and ubicacion_val.strip():
        sector = db.scalar(select(Sector).where(Sector.nombre == ubicacion_val.strip()))
        if sector is None:
            sector = Sector(nombre=ubicacion_val.strip())
            db.add(sector)
            db.flush()
        sector_id = sector.id
        datos["sector_id"] = sector_id
    else:
        sector_id = None
    if sector_id is not None:
        sector_obj = db.scalar(select(Sector).where(Sector.id == sector_id))
        if sector_obj is None:
            raise SectorNoEncontrado()
    if datos:
        db.execute(
            update(Equipo).where(Equipo.id == equipo_id).values(**datos)
        )
        db.commit()
        db.refresh(db_equipo)
    return db_equipo

def eliminar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    if db_equipo:
        db_equipo.estado = Estado.INACTIVO
        db.commit()
        db.refresh(db_equipo)
    return db_equipo

def reactivar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    if db_equipo:
        db_equipo.estado = Estado.ACTIVO
        db.commit()
        db.refresh(db_equipo)
    return db_equipo