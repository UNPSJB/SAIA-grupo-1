import logging
from typing import List, Literal, Optional
import uuid
from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.indentificadorDeQR.models import IndentificadorUnico
from src.indentificadorDeQR import schemas, exceptions



def crear_IdentificadorUnico(db:Session,ident:schemas.IdentificadorQRCreate,urldelQR:str) -> schemas.IdentificadorQR:
    datos = ident.model_dump()

    datos["id_alfanumerico"]=str(uuid.uuid4())
    datos["estado"]=True
    datos["urldelQR"]=urldelQR
    _ident=IndentificadorUnico(**datos)
    db.add(_ident)
    db.commit()
    db.refresh(_ident)
    return _ident



def verificar_identificadorQR(db:Session,identificador_id:str) -> schemas.IdentificadorQR:
    db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
    if not db_identQR:
        raise HTTPException(status_code=404, detail="El código QR no existe")
    if db_identQR.estado is False:
            raise exceptions.CodigoQRInHabilitado()
    return db_identQR


def editar_identificadorQr(db:Session,identificador_id:str)-> schemas.IdentificadorQR:
     db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
     

     db_identQR.estado=False

     
             
     db.commit()
     db.refresh(db_identQR)
     return db_identQR

