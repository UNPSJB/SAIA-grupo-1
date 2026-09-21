import logging
from typing import List, Literal
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.tareas.models import Tarea
from src.tareas import schemas, exceptions




# CRUD DE TAREA

def crear_tarea(db: Session, tarea: schemas.TareaCreate) -> schemas.Tarea:
    _tarea = Tarea(**tarea.model_dump())
    db.add(_tarea)
    db.commit()
    db.refresh(_tarea)
    return _tarea

def listar_tareas(db: Session) -> List[schemas.Tarea]:
    return db.scalars(select(Tarea)).all() 

def obtener_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = db.scalar(select(Tarea).where(Tarea.id == tarea_id))
    if db_tarea is None:
        raise exceptions.TareNoEncontrada()
    return db_tarea

def editar_tarea(db: Session, tarea_id: int, tarea: schemas.TareaUpdate) -> schemas.Tarea:
    db_tarea = obtener_tarea(db, tarea_id)
    db.execute(
        update(Tarea).where(Tarea.id == tarea_id).values(**tarea.model_dump())
    )
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

def eliminar_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = obtener_tarea(db, tarea_id)
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return db_tarea