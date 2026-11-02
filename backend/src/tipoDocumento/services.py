from typing import List
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session
from src.tipoDocumento import exceptions
from src.tipoDocumento.models import TipoDocumento
from src.documentos.models import Documento

def crear_tipo_documento(db: Session, nombre: str) -> TipoDocumento:
    nombre_limpio = " ".join(nombre.split())
    if not nombre_limpio:
        raise exceptions.TipoVacio()

    nombre_sin_espacios = nombre_limpio.replace(" ", "").lower()

    existente = db.scalar(
        select(TipoDocumento).where(
            func.lower(func.replace(TipoDocumento.nombre, " ", ""))
            == nombre_sin_espacios
        )
    )
    if existente:
        raise exceptions.TipoDocumentoYaExiste()

    _tipo = TipoDocumento(nombre=nombre_limpio)
    db.add(_tipo)
    db.commit()
    db.refresh(_tipo)
    return _tipo

def listar_tipos_documentos(db: Session) -> List[TipoDocumento]:
    return db.scalars(select(TipoDocumento).order_by(TipoDocumento.nombre.asc())).all()

def obtener_tipo_documento(db: Session, tipo_id: int) -> TipoDocumento:
    db_tipo = db.scalar(
        select(TipoDocumento).where(TipoDocumento.id == tipo_id)
    )
    if db_tipo is None:
        raise exceptions.TipoDocumentoNoEncontrado()
    return db_tipo

def actualizar_tipo_documento(db: Session, tipo_id: int, nombre: str) -> TipoDocumento:
    db_tipo = obtener_tipo_documento(db, tipo_id)
    nombre_limpio = " ".join(nombre.split())
    if not nombre_limpio:
        raise exceptions.TipoVacio()

    nombre_sin_espacios = nombre_limpio.replace(" ", "").lower()
    existente = db.scalar(
        select(TipoDocumento).where(
            func.lower(func.replace(TipoDocumento.nombre, " ", "")) == nombre_sin_espacios,
            TipoDocumento.id != tipo_id,
        )
    )
    if existente:
        raise exceptions.TipoDocumentoYaExiste()

    db_tipo.nombre = nombre_limpio
    db.commit()
    db.refresh(db_tipo)
    return db_tipo

def eliminar_tipo_documento(db: Session, tipo_id: int) -> None:
    db_tipo = obtener_tipo_documento(db, tipo_id)

    en_uso = db.scalar(
        select(Documento).where(
            func.lower(func.replace(Documento.tipo, " ", ""))
            == db_tipo.nombre.replace(" ", "").lower()
        )
    )
    if en_uso:
        raise exceptions.TipoDocumentoEnUso()

    db.execute(delete(TipoDocumento).where(TipoDocumento.id == tipo_id))
    db.commit()

