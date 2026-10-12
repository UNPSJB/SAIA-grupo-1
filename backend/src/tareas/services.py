import logging
from typing import List, Literal
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import es_operador
from src.personal.models import Personal
from src.tareas.models import Tarea
from src.tareas import schemas, exceptions




def validar_operador(db: Session, legajo: int) -> None:
    """Una tarea solo puede asignarse a personal activo con capacidad de operar."""
    persona = db.get(Personal, legajo)
    if persona is None or not persona.activo or not es_operador(persona):
        raise exceptions.OperadorInvalido()


# CRUD DE TAREA

def crear_tarea(db: Session, tarea: schemas.TareaCreate) -> schemas.Tarea:
    validar_operador(db, tarea.operador_legajo)
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
    # Los campos que no se mandan (por ejemplo, el operador) conservan el valor que ya tenían.
    datos = {campo: valor for campo, valor in tarea.model_dump().items() if valor is not None}
    if "operador_legajo" in datos:
        validar_operador(db, datos["operador_legajo"])
    db.execute(
        update(Tarea).where(Tarea.id == tarea_id).values(**datos)
    )
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

def eliminar_tarea(db: Session, tarea_id: int) -> schemas.Tarea:
    db_tarea = obtener_tarea(db, tarea_id)

    if not db_tarea:
        return False
    
    db.execute(delete(Tarea).where(Tarea.id == tarea_id))
    db.commit()
    return db_tarea
