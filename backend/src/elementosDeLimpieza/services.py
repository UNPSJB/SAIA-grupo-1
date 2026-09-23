import logging
from typing import List, Literal
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.elementosDeLimpieza.models import ElementoDeLimpieza
from src.elementosDeLimpieza import schemas, exceptions

#CRUD de Elementos de Limpieza

def crear_elementoDeLimpieza(db: Session, elementoDeLimpieza: schemas.ElementoDeLimpiezaCreate) -> schemas.ElementoDeLimpieza:
    _elementoDeLimpieza =ElementoDeLimpieza(**elementoDeLimpieza.model_dump())
    db.add(_elementoDeLimpieza)
    db.commit()
    db.refresh(_elementoDeLimpieza)
    return _elementoDeLimpieza

def listar_elementosDeLimpiezas(db: Session) -> List[schemas.ElementoDeLimpieza]:
    return db.scalars(select(ElementoDeLimpieza)).all() 

def obtener_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = db.scalar(select(ElementoDeLimpieza).where(ElementoDeLimpieza.id ==elementoDeLimpieza_id))
    if db_elementoDeLimpieza is None:
        raise exceptions.ElementoNoEncontrado()
    return db_elementoDeLimpieza

def editar_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int, elementoDeLimpieza: schemas.ElementoDeLimpiezaUpdate) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)
    db.execute(
        update(ElementoDeLimpieza).where(ElementoDeLimpieza.id ==elementoDeLimpieza_id).values(**elementoDeLimpieza.model_dump())
    )
    db.commit()
    db.refresh(db_elementoDeLimpieza)
    return db_elementoDeLimpieza

def eliminar_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)
    if db_elementoDeLimpieza:
            db_elementoDeLimpieza.activo = False
            db.commit()
            db.refresh(db_elementoDeLimpieza)
    
    return db_elementoDeLimpieza
