from datetime import date, datetime, timedelta
import mimetypes
from pathlib import Path
import shutil
from typing import List, Optional
from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from src.alergenos import schemas, exceptions
from src.alergenos.models import Alergeno




def crear_alergeno(db: Session, alerg:schemas.AlergenoCreate) -> schemas.AlergenoBase:
    _alerg = Alergeno(**alerg.model_dump())

    db.add(_alerg)
    db.commit()
    db.refresh(_alerg)
    return _alerg


def listar_alergenos(db:Session)-> List[schemas.Alergeno]:
    return list(db.scalars(select(Alergeno)).all())


def leer_alergeno(db:Session, alerg_id:int) -> schemas.Alergeno:
       db_alg = db.scalar(select(Alergeno).where(Alergeno.id == alerg_id))
       if db_alg is None:
           raise exceptions.Alergenos_cero()
       return db_alg

def actualizar_alergeno(
    db: Session,
    alergeno_id: int,
    alergeno: schemas.AlergenoUpdate,
) -> Alergeno:
    db_alergeno = leer_alergeno(db, alergeno_id)
    datos = alergeno.model_dump(exclude_unset=True)

    if "nombre" in datos and datos["nombre"] is not None:
        nuevo_nombre = datos["nombre"].strip()
        duplicado = db.scalar(
            select(Alergeno).where(
                func.lower(Alergeno.nombre) == nuevo_nombre.lower(),
                Alergeno.id != alergeno_id,
            )
        )
        if duplicado is not None:
            raise exceptions.Nombre_Duplicado()
        db_alergeno.nombre = nuevo_nombre

    for campo, valor in datos.items():
        if campo != "nombre":
            setattr(db_alergeno, campo, valor)

    if datos:
        db.commit()
        db.refresh(db_alergeno)

    return db_alergeno