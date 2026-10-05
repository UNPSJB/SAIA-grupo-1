import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional, Tuple, Union
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.auditoria.models import AccionAuditoria
from src.auditoria.schemas import AuditoriaCreate
from src.auditoria.services import registrar_auditoria
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.documentos import exceptions
from src.documentos.constants import TAMANIO_MAXIMO_BYTES, TipoDocumento
from src.documentos.models import Documento, VersionDocumento

STORAGE_DIR = Path(__file__).resolve().parent / "archivos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def es_administrador(persona: Personal) -> bool:
    return persona.capacidad in (Capacidades.ADMINISTRAR, Capacidades.AMBAS)

def verificar_permiso_administrador(
    db: Session,
    responsable_legajo: Optional[int] = None,
    usuario: Optional[Personal] = None,
) -> Personal:
    if usuario is not None:
        if not usuario.activo:
            raise exceptions.ResponsableInactivo()
        if not es_administrador(usuario):
            raise exceptions.SoloAdministradorPuedeSubir()
        return usuario

    if responsable_legajo is not None:
        persona = db.scalar(select(Personal).where(Personal.legajo == responsable_legajo))
        if not persona:
            raise exceptions.ResponsableNoEncontrado()
        if not persona.activo:
            raise exceptions.ResponsableInactivo()
        if not es_administrador(persona):
            raise exceptions.SoloAdministradorPuedeSubir()
        return persona

    persona = db.scalar(
        select(Personal).where(
            Personal.activo == True,
            Personal.capacidad.in_([Capacidades.ADMINISTRAR, Capacidades.AMBAS]),
        )
    )
    if not persona:
        raise exceptions.SoloAdministradorPuedeSubir()
    return persona

def validar_y_guardar_archivo_pdf(file: UploadFile, documento_id: int, version: Union[int, str]) -> Tuple[str, str, int]:
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

    version_sanitizada = "".join(c for c in str(version) if c.isalnum() or c in (".", "_", "-"))
    nombre_disco = f"doc_{documento_id}_v{version_sanitizada}_{uuid.uuid4().hex[:8]}.pdf"
    ruta_destino = STORAGE_DIR / nombre_disco

    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    return nombre_disco, nombre_original, tamanio

def calcular_siguiente_version(versiones: List[VersionDocumento]) -> int:
    if not versiones:
        return 1
    numeros = []
    for v in versiones:
        try:
            numeros.append(int(v.version))
        except (ValueError, TypeError):
            pass
    if numeros:
        return max(numeros) + 1
    return len(versiones) + 1

def crear_documento(
    db: Session,
    titulo: str,
    tipo: TipoDocumento,
    version: Optional[Union[int, str]] = None,
    file: Optional[UploadFile] = None,
    descripcion: Optional[str] = None,
    fecha_vigencia: Optional[date] = None,
    usuario: Optional[Personal] = None,
    responsable_legajo: Optional[int] = None,
) -> Documento:
    if isinstance(version, UploadFile) and file is None:
        file = version
        version = None

    persona = verificar_permiso_administrador(db, responsable_legajo=responsable_legajo, usuario=usuario)

    titulo_limpio = titulo.strip()
    if not titulo_limpio:
        raise exceptions.BadRequest()

    if version is not None:
        try:
            version_int = int(float(str(version).strip().lower().lstrip("v")))
        except (ValueError, TypeError):
            version_int = 1
    else:
        version_int = 1

    nuevo_doc = Documento(
        titulo=titulo_limpio,
        tipo=tipo,
        descripcion=descripcion.strip() if descripcion else None,
        activo=True,
    )
    db.add(nuevo_doc)
    db.flush()

    archivo_nombre, archivo_original, tamanio = validar_y_guardar_archivo_pdf(
        file, nuevo_doc.id, version_int
    )

    fecha_v = fecha_vigencia or date.today()
    primera_version = VersionDocumento(
        documento_id=nuevo_doc.id,
        version=version_int,
        archivo_nombre=archivo_nombre,
        archivo_nombre_original=archivo_original,
        tamanio_bytes=tamanio,
        archivado=False,
        es_vigente=True,
        fecha_vigencia=fecha_v,
    )
    db.add(primera_version)
    db.flush()

    responsable_desc = f"{persona.legajo} - {persona.nombre} {persona.apellido}".strip()
    registrar_auditoria(
        db,
        AuditoriaCreate(
            tabla="documentos",
            registro_id=nuevo_doc.id,
            accion=AccionAuditoria.CREAR,
            campo="version_vigente",
            valor_previo=None,
            valor_posterior=f"v{primera_version.version} (vigencia: {fecha_v}, usuario: {responsable_desc})",
        ),
        commit=False,
    )
    db.commit()
    db.refresh(nuevo_doc)
    return nuevo_doc

def subir_nueva_version(
    db: Session,
    documento_id: int,
    version: Optional[Union[int, str]] = None,
    file: Optional[UploadFile] = None,
    usuario: Optional[Personal] = None,
    responsable_legajo: Optional[int] = None,
) -> VersionDocumento:
    if isinstance(version, UploadFile) and file is None:
        file = version
        version = None

    verificar_permiso_administrador(db, responsable_legajo=responsable_legajo, usuario=usuario)

    doc = db.scalar(select(Documento).where(Documento.id == documento_id, Documento.activo == True))
    if not doc:
        raise exceptions.DocumentoNoEncontrado()

    versiones_previas = db.scalars(
        select(VersionDocumento).where(VersionDocumento.documento_id == documento_id)
    ).all()

    if version is not None:
        try:
            version_int = int(float(str(version).strip().lower().lstrip("v")))
        except (ValueError, TypeError):
            version_int = calcular_siguiente_version(versiones_previas)
    else:
        version_int = calcular_siguiente_version(versiones_previas)

    version_existente = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.documento_id == documento_id,
            VersionDocumento.version == version_int,
        )
    )
    if version_existente:
        raise exceptions.VersionDuplicada()

    archivo_nombre, archivo_original, tamanio = validar_y_guardar_archivo_pdf(
        file, documento_id, version_int
    )

    for v in versiones_previas:
        v.archivado = True

    nueva_version = VersionDocumento(
        documento_id=documento_id,
        version=version_int,
        archivo_nombre=archivo_nombre,
        archivo_nombre_original=archivo_original,
        tamanio_bytes=tamanio,
        archivado=False,
        es_vigente=False,
        fecha_vigencia=None,
    )
    db.add(nueva_version)
    db.commit()
    db.refresh(nueva_version)
    return nueva_version

def marcar_version_vigente(
    db: Session,
    documento_id: int,
    version_id: int,
    fecha_vigencia: date,
    usuario: Optional[Personal] = None,
    responsable_legajo: Optional[int] = None,
) -> VersionDocumento:
    persona = verificar_permiso_administrador(db, responsable_legajo=responsable_legajo, usuario=usuario)

    doc = db.scalar(select(Documento).where(Documento.id == documento_id, Documento.activo == True))
    if not doc:
        raise exceptions.DocumentoNoEncontrado()

    version_destino = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.id == version_id,
            VersionDocumento.documento_id == documento_id,
        )
    )
    if not version_destino:
        raise exceptions.VersionNoEncontrada()

    version_anterior = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.documento_id == documento_id,
            VersionDocumento.es_vigente == True,
        )
    )

    versiones = db.scalars(
        select(VersionDocumento).where(VersionDocumento.documento_id == documento_id)
    ).all()
    for v in versiones:
        v.es_vigente = False

    version_destino.es_vigente = True
    version_destino.fecha_vigencia = fecha_vigencia

    previo = f"v{version_anterior.version}" if version_anterior else None
    responsable_desc = f"{persona.legajo} - {persona.nombre} {persona.apellido}".strip()
    registrar_auditoria(
        db,
        AuditoriaCreate(
            tabla="documentos",
            registro_id=documento_id,
            accion=AccionAuditoria.MODIFICAR,
            campo="version_vigente",
            valor_previo=previo,
            valor_posterior=f"v{version_destino.version} (vigencia: {fecha_vigencia}, usuario: {responsable_desc})",
        ),
        commit=False,
    )
    db.commit()
    db.refresh(version_destino)
    return version_destino

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

def listar_versiones_documento(db: Session, documento_id: int) -> List[VersionDocumento]:
    obtener_documento(db, documento_id)
    query = (
        select(VersionDocumento)
        .where(VersionDocumento.documento_id == documento_id)
        .order_by(VersionDocumento.id.desc())
    )
    return list(db.scalars(query).all())

def obtener_archivo_version(db: Session, version_id: int) -> Tuple[Path, str]:
    version = db.scalar(select(VersionDocumento).where(VersionDocumento.id == version_id))
    if not version:
        raise exceptions.VersionNoEncontrada()

    ruta = STORAGE_DIR / version.archivo_nombre
    if not ruta.is_file():
        raise exceptions.ArchivoNoEncontrado()

    return ruta, version.archivo_nombre_original
