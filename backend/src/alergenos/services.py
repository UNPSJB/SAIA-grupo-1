from datetime import date, datetime, timedelta
import mimetypes
from pathlib import Path
import shutil
from typing import List, Optional
from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.alergenos import schemas, exceptions
from src.alergenos.models import Alergeno




def crear_alergeno(db: Session, alerg:schemas.AlergenoCreate) -> schemas.AlergenoBase:
    _alerg = Alergeno(**alerg.model_dump())

    db.add(_alerg)
    db.commit()
    db.refresh(_alerg)
    return _alerg


def leer_alergenos(db:Session)-> List[schemas.Alergeno]:
    return list(db.scalars(select(Alergeno)).all())


def leer_alergeno(db:Session, alerg_id:int) -> schemas.Alergeno:
       db_alg = db.scalar(select(Alergeno).where(Alergeno.id == alerg_id))
       if db_alg is None:
           raise exceptions.Alergenos_cero()
       return db_alg