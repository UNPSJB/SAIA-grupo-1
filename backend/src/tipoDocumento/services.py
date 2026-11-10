from typing import List, Optional, Dict, Any
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session
from src.tipoDocumento import exceptions
from src.tipoDocumento.models import TipoDocumento
from src.documentos.models import Documento

def obtener_tipos_para_csv(
    db: Session,
    busqueda: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = select(TipoDocumento)
    
    if busqueda:
        termino = f"%{busqueda.strip()}%"
        query = query.where(TipoDocumento.nombre.ilike(termino))
        
    tipos = db.scalars(query.order_by(TipoDocumento.id.asc())).all()
    
    return [
        {
            "id": t.id,
            "nombre": t.nombre
        }
        for t in tipos
    ]

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

DEFAULT_TIPOS = ["Manual de BPM", "Ficha Técnica", "Procedimiento", "Receta"]

def asegurar_tipos_base(db: Session):
    existentes = db.scalars(select(TipoDocumento)).all()
    existentes_nombres = {t.nombre.replace(" ", "").lower() for t in existentes}
    agregados = False
    for nombre in DEFAULT_TIPOS:
        if nombre.replace(" ", "").lower() not in existentes_nombres:
            db.add(TipoDocumento(nombre=nombre))
            agregados = True
    if agregados:
        db.commit()

def listar_tipos_documentos(db: Session) -> List[TipoDocumento]:
    asegurar_tipos_base(db)
    return list(db.scalars(select(TipoDocumento).order_by(TipoDocumento.nombre.asc())).all())

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
            func.lower(func.replace(Documento.tipo, " ", "")) == db_tipo.nombre.replace(" ", "").lower()

        )
    )
    if en_uso:
        raise exceptions.TipoDocumentoEnUso()

    db.execute(delete(TipoDocumento).where(TipoDocumento.id == tipo_id))
    db.commit()

