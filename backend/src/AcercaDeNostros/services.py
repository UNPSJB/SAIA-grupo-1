
import logging
from typing import List, Literal, Optional
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.AcercaDeNostros.models import AcercaDeNosotros
from src.AcercaDeNostros import schemas, exceptions



def crearAcercaDeNostros(db:Session, descip:schemas.AcercaDeNosotrosCreate)->schemas.AcercaDeNosotros:
    _descrip=AcercaDeNosotros(**descip.model_dump())

    db.add(_descrip)
    db.commit()
    db.refresh(_descrip)
    return _descrip


def actualizarAcercaDeNostros(db: Session, id: int, descrip: schemas.AcercaDeNosotrosCreate) -> Optional[AcercaDeNosotros]:
    _descrip = db.query(AcercaDeNosotros).filter(AcercaDeNosotros.id == id).first() 
    _descrip.descripcion = descrip.descripcion
    db.commit()
    db.refresh(_descrip)
    return _descrip

def obtener_acerca_de_nosotros(db: Session):
    return db.query(AcercaDeNosotros).first()