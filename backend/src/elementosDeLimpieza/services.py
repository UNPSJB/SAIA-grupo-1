import logging
from typing import List, Literal, Optional
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.elementosDeLimpieza.models import ElementoDeLimpieza
from src.elementosDeLimpieza import schemas, exceptions
from datetime import datetime, timedelta

#CRUD de Elementos de Limpieza

def calcular_fecha_cambio(frecuencia: Optional[int]) -> Optional[datetime]:
    if frecuencia is not None and frecuencia > 0:
        return datetime.now() + timedelta(days=frecuencia)
    return None

def crear_elementoDeLimpieza(db: Session, elementoDeLimpieza: schemas.ElementoDeLimpiezaCreate) -> schemas.ElementoDeLimpieza:

    datos = elementoDeLimpieza.model_dump()
    
    datos["fechaCambio"] = calcular_fecha_cambio(elementoDeLimpieza.frecuenciaDeCambio)

    _elementoDeLimpieza =ElementoDeLimpieza(**datos)
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

    datos_actualizar = elementoDeLimpieza.model_dump(exclude_unset=True)

    if "frecuenciaDeCambio" in datos_actualizar:
        datos_actualizar["fechaCambio"] = calcular_fecha_cambio(
            datos_actualizar["frecuenciaDeCambio"]
        )

    db.execute(
        update(ElementoDeLimpieza).where(ElementoDeLimpieza.id ==elementoDeLimpieza_id).values(**datos_actualizar)
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

from datetime import datetime, timedelta
from src.elementosDeLimpieza.models import ElementoDeLimpieza

def registrar_cambio_fecha(db: Session, elemento_id: int) -> ElementoDeLimpieza:
    elemento = obtener_elementoDeLimpieza(db, elemento_id)
    
    # Recalcula la fecha sumando la frecuencia a partir de ahora
    if elemento.frecuenciaDeCambio and elemento.frecuenciaDeCambio > 0:
        elemento.fechaCambio = datetime.now() + timedelta(days=elemento.frecuenciaDeCambio)
    else:
        elemento.fechaCambio = None

    db.commit()
    db.refresh(elemento)
    return elemento
