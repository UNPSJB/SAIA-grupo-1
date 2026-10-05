import uuid
from pathlib import Path
from typing import List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.documentos import exceptions
from src.documentos.constants import TAMANIO_MAXIMO_BYTES, TipoDocumento
from src.documentos.models import Documento, VersionDocumento

STORAGE_DIR = Path(__file__).resolve().parent / "archivos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def es_administrador(persona: Personal) -> bool:
    return persona.capacidad in (Capacidades.ADMINISTRAR, Capacidades.AMBAS)

def verificar_permiso_administrador(db: Session, responsable_legajo: int) -> Personal:
    persona = db.scalar(select(Personal).where(Personal.legajo == responsable_legajo))
    if not persona:
        raise exceptions.ResponsableNoEncontrado()
    if not persona.activo:
        raise exceptions.ResponsableInactivo()
    if not es_administrador(persona):
        raise exceptions.SoloAdministradorPuedeSubir()
    return persona

def validar_y_guardar_archivo_pdf(file: UploadFile, documento_id: int, version: str) -> Tuple[str, str, int]:
    nombre_original = file.filename or "documento.pdf"
    extension = Path(nombre_original).suffix.lower()
    if extension != ".pdf":
        raise exceptions.FormatoArchivoInvalido()

    contenido = file.file.read()
    if not contenido:
        raise exceptions.ArchivoVacio()

    tamanio = len(contenido)
    if tamanio > TAMANIO_MAXIMO_BYTES:
        raise exceptions.ArchivoDemasiadoGrande()

    if not contenido.startswith(b"%PDF"):
        raise exceptions.FormatoArchivoInvalido()

    version_sanitizada = "".join(c for c in version if c.isalnum() or c in (".", "_", "-"))
    nombre_disco = f"doc_{documento_id}_v{version_sanitizada}_{uuid.uuid4().hex[:8]}.pdf"
    ruta_destino = STORAGE_DIR / nombre_disco

    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    return nombre_disco, nombre_original, tamanio

def crear_documento(
    db: Session,
    titulo: str,
    tipo: TipoDocumento,
    version: str,
    responsable_legajo: int,
    file: UploadFile,
    descripcion: Optional[str] = None,
) -> Documento:
    verificar_permiso_administrador(db, responsable_legajo)

    titulo_limpio = titulo.strip()
    version_limpia = version.strip()
    if not titulo_limpio:
        raise exceptions.BadRequest()
    if not version_limpia:
        raise exceptions.BadRequest()

    nuevo_doc = Documento(
        titulo=titulo_limpio,
        tipo=tipo,
        descripcion=descripcion.strip() if descripcion else None,
        activo=True,
    )
    db.add(nuevo_doc)
    db.flush()

    archivo_nombre, archivo_original, tamanio = validar_y_guardar_archivo_pdf(
        file, nuevo_doc.id, version_limpia
    )

    primera_version = VersionDocumento(
        documento_id=nuevo_doc.id,
        version=version_limpia,
        archivo_nombre=archivo_nombre,
        archivo_nombre_original=archivo_original,
        tamanio_bytes=tamanio,
        responsable_legajo=responsable_legajo,
        archivado=False,
    )
    db.add(primera_version)
    db.commit()
    db.refresh(nuevo_doc)
    return nuevo_doc

def subir_nueva_version(
    db: Session,
    documento_id: int,
    version: str,
    responsable_legajo: int,
    file: UploadFile,
) -> VersionDocumento:
    verificar_permiso_administrador(db, responsable_legajo)

    doc = db.scalar(select(Documento).where(Documento.id == documento_id, Documento.activo == True))
    if not doc:
        raise exceptions.DocumentoNoEncontrado()

    version_limpia = version.strip()
    if not version_limpia:
        raise exceptions.BadRequest()

    version_existente = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.documento_id == documento_id,
            func.lower(VersionDocumento.version) == version_limpia.lower(),
        )
    )
    if version_existente:
        raise exceptions.VersionDuplicada()

    archivo_nombre, archivo_original, tamanio = validar_y_guardar_archivo_pdf(
        file, documento_id, version_limpia
    )

    versiones_previas = db.scalars(
        select(VersionDocumento).where(VersionDocumento.documento_id == documento_id)
    ).all()
    for v in versiones_previas:
        v.archivado = True

    nueva_version = VersionDocumento(
        documento_id=documento_id,
        version=version_limpia,
        archivo_nombre=archivo_nombre,
        archivo_nombre_original=archivo_original,
        tamanio_bytes=tamanio,
        responsable_legajo=responsable_legajo,
        archivado=False,
    )
    db.add(nueva_version)
    db.commit()
    db.refresh(nueva_version)
    return nueva_version

def listar_documentos(
    db: Session,
    tipo: Optional[TipoDocumento] = None,
    busqueda: Optional[str] = None,
) -> List[Documento]:
    query = select(Documento).where(Documento.activo == True)
    if tipo is not None:
        query = query.where(Documento.tipo == tipo)
    if busqueda:
        termino = f"%{busqueda.strip()}%"
        query = query.where(Documento.titulo.ilike(termino))
    query = query.order_by(Documento.id.desc())
    return list(db.scalars(query).all())

def obtener_documento(db: Session, documento_id: int) -> Documento:
    doc = db.scalar(select(Documento).where(Documento.id == documento_id, Documento.activo == True))
    if not doc:
        raise exceptions.DocumentoNoEncontrado()
    return doc

def obtener_archivo_version(db: Session, version_id: int) -> Tuple[Path, str]:
    version = db.scalar(select(VersionDocumento).where(VersionDocumento.id == version_id))
    if not version:
        raise exceptions.VersionNoEncontrada()

    ruta = STORAGE_DIR / version.archivo_nombre
    if not ruta.is_file():
        raise exceptions.ArchivoNoEncontrado()

    return ruta, version.archivo_nombre_original
