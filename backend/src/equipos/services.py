import logging
from typing import List, Literal
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.equipos.models import Equipo
from src.equipos import schemas, exceptions





# CRUD DE EQUIPOS

def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> schemas.Equipo:
    _equipo = Equipo(**equipo.model_dump())
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(db: Session) -> List[schemas.Equipo]:
    return db.scalars(select(Equipo)).all()

def obtener_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return db_equipo

def editar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    db.execute(
        update(Equipo).where(Equipo.id == equipo_id).values(**equipo.model_dump())
    )
    db.commit()
    db.refresh(db_equipo)
    return db_equipo

def eliminar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    db.execute(delete(Equipo).where(Equipo.id == equipo_id))
    db.commit()
    return db_equipo