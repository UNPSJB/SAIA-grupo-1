import base64
import json
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.documentos import exceptions, schemas, services
from src.documentos.constants import TipoDocumento

router = APIRouter(prefix="/documentos", tags=["Documentos Versionados"])

def obtener_usuario_actual(
    request: Request,
    db: Session = Depends(get_db),
) -> Personal:
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth[7:]
        try:
            parts = token.split(".")
            if len(parts) == 3:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload = json.loads(base64.urlsafe_b64decode(padded))
                legajo = int(payload.get("sub"))
                persona = db.scalar(select(Personal).where(Personal.legajo == legajo))
                if persona and persona.activo:
                    if persona.capacidad not in (Capacidades.ADMINISTRAR, Capacidades.AMBAS):
                        raise exceptions.SoloAdministradorPuedeSubir()
                    return persona
        except (exceptions.SoloAdministradorPuedeSubir, exceptions.PermissionDenied):
            raise
        except Exception:
            pass

    legajo_header = request.headers.get("X-User-Legajo")
    if legajo_header:
        persona = db.scalar(select(Personal).where(Personal.legajo == int(legajo_header)))
        if persona:
            if not persona.activo:
                raise exceptions.ResponsableInactivo()
            if persona.capacidad not in (Capacidades.ADMINISTRAR, Capacidades.AMBAS):
                raise exceptions.SoloAdministradorPuedeSubir()
            return persona

    persona = db.scalar(
        select(Personal).where(
            Personal.activo == True,
            Personal.capacidad.in_([Capacidades.ADMINISTRAR, Capacidades.AMBAS]),
        )
    )
    if persona:
        return persona

    raise exceptions.SoloAdministradorPuedeSubir()

@router.post(
    "",
    response_model=schemas.DocumentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_documento_endpoint(
    titulo: str = Form(...),
    tipo: TipoDocumento = Form(...),
    version: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    descripcion: Optional[str] = Form(None),
    fecha_vigencia: Optional[date] = Form(None),
    responsable_legajo: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(obtener_usuario_actual),
):
    doc = services.crear_documento(
        db=db,
        titulo=titulo,
        tipo=tipo,
        version=version,
        file=archivo,
        descripcion=descripcion,
        fecha_vigencia=fecha_vigencia,
        usuario=usuario,
        responsable_legajo=responsable_legajo,
    )
    v_actual = doc.version_actual
    v_vigente = doc.version_vigente
    return schemas.DocumentoResponse(
        id=doc.id,
        titulo=doc.titulo,
        tipo=doc.tipo,
        descripcion=doc.descripcion,
        activo=doc.activo,
        creado_el=doc.creado_el,
        version_actual=schemas.VersionDocumentoResponse(
            id=v_actual.id,
            documento_id=v_actual.documento_id,
            version=v_actual.version,
            archivo_nombre_original=v_actual.archivo_nombre_original,
            tamanio_bytes=v_actual.tamanio_bytes,
            archivado=v_actual.archivado,
            es_vigente=v_actual.es_vigente,
            fecha_vigencia=v_actual.fecha_vigencia,
            creado_el=v_actual.creado_el,
            url_descarga=f"/documentos/archivo/{v_actual.id}",
        ) if v_actual else None,
        version_vigente=schemas.VersionDocumentoResponse(
            id=v_vigente.id,
            documento_id=v_vigente.documento_id,
            version=v_vigente.version,
            archivo_nombre_original=v_vigente.archivo_nombre_original,
            tamanio_bytes=v_vigente.tamanio_bytes,
            archivado=v_vigente.archivado,
            es_vigente=v_vigente.es_vigente,
            fecha_vigencia=v_vigente.fecha_vigencia,
            creado_el=v_vigente.creado_el,
            url_descarga=f"/documentos/archivo/{v_vigente.id}",
        ) if v_vigente else None,
        total_versiones=len(doc.versiones),
    )

@router.post(
    "/{documento_id}/versiones",
    response_model=schemas.VersionDocumentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def subir_nueva_version_endpoint(
    documento_id: int,
    version: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    responsable_legajo: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(obtener_usuario_actual),
):
    v = services.subir_nueva_version(
        db=db,
        documento_id=documento_id,
        version=version,
        file=archivo,
        usuario=usuario,
        responsable_legajo=responsable_legajo,
    )
    return schemas.VersionDocumentoResponse(
        id=v.id,
        documento_id=v.documento_id,
        version=v.version,
        archivo_nombre_original=v.archivo_nombre_original,
        tamanio_bytes=v.tamanio_bytes,
        archivado=v.archivado,
        es_vigente=v.es_vigente,
        fecha_vigencia=v.fecha_vigencia,
        creado_el=v.creado_el,
        url_descarga=f"/documentos/archivo/{v.id}",
    )

@router.post(
    "/{documento_id}/versiones/{version_id}/vigente",
    response_model=schemas.VersionDocumentoResponse,
)
def marcar_version_vigente_endpoint(
    documento_id: int,
    version_id: int,
    datos: schemas.MarcarVigenteRequest,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(obtener_usuario_actual),
):
    v = services.marcar_version_vigente(
        db=db,
        documento_id=documento_id,
        version_id=version_id,
        fecha_vigencia=datos.fecha_vigencia,
        usuario=usuario,
    )
    return schemas.VersionDocumentoResponse(
        id=v.id,
        documento_id=v.documento_id,
        version=v.version,
        archivo_nombre_original=v.archivo_nombre_original,
        tamanio_bytes=v.tamanio_bytes,
        archivado=v.archivado,
        es_vigente=v.es_vigente,
        fecha_vigencia=v.fecha_vigencia,
        creado_el=v.creado_el,
        url_descarga=f"/documentos/archivo/{v.id}",
    )

@router.get(
    "",
    response_model=List[schemas.DocumentoListItem],
)
def listar_documentos_endpoint(
    tipo: Optional[TipoDocumento] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    docs = services.listar_documentos(db, tipo=tipo, busqueda=busqueda)
    items = []
    for d in docs:
        v = d.version_vigente
        items.append(
            schemas.DocumentoListItem(
                id=d.id,
                titulo=d.titulo,
                tipo=d.tipo,
                descripcion=d.descripcion,
                activo=d.activo,
                creado_el=d.creado_el,
                version_actual=v.version if v else None,
                version_actual_id=v.id if v else None,
                fecha_subida_actual=v.creado_el if v else None,
                archivo_nombre_original=v.archivo_nombre_original if v else None,
                es_vigente=v.es_vigente if v else False,
                fecha_vigencia=v.fecha_vigencia if v else None,
                total_versiones=len(d.versiones),
            )
        )
    return items

@router.get(
    "/{documento_id}",
    response_model=schemas.DocumentoResponse,
)
def obtener_documento_endpoint(
    documento_id: int,
    db: Session = Depends(get_db),
):
    doc = services.obtener_documento(db, documento_id)
    v_actual = doc.version_actual
    v_vigente = doc.version_vigente
    return schemas.DocumentoResponse(
        id=doc.id,
        titulo=doc.titulo,
        tipo=doc.tipo,
        descripcion=doc.descripcion,
        activo=doc.activo,
        creado_el=doc.creado_el,
        version_actual=schemas.VersionDocumentoResponse(
            id=v_actual.id,
            documento_id=v_actual.documento_id,
            version=v_actual.version,
            archivo_nombre_original=v_actual.archivo_nombre_original,
            tamanio_bytes=v_actual.tamanio_bytes,
            archivado=v_actual.archivado,
            es_vigente=v_actual.es_vigente,
            fecha_vigencia=v_actual.fecha_vigencia,
            creado_el=v_actual.creado_el,
            url_descarga=f"/documentos/archivo/{v_actual.id}",
        ) if v_actual else None,
        version_vigente=schemas.VersionDocumentoResponse(
            id=v_vigente.id,
            documento_id=v_vigente.documento_id,
            version=v_vigente.version,
            archivo_nombre_original=v_vigente.archivo_nombre_original,
            tamanio_bytes=v_vigente.tamanio_bytes,
            archivado=v_vigente.archivado,
            es_vigente=v_vigente.es_vigente,
            fecha_vigencia=v_vigente.fecha_vigencia,
            creado_el=v_vigente.creado_el,
            url_descarga=f"/documentos/archivo/{v_vigente.id}",
        ) if v_vigente else None,
        total_versiones=len(doc.versiones),
    )

@router.get(
    "/{documento_id}/versiones",
    response_model=List[schemas.VersionDocumentoResponse],
)
def listar_versiones_endpoint(
    documento_id: int,
    db: Session = Depends(get_db),
):
    versiones = services.listar_versiones_documento(db, documento_id)
    return [
        schemas.VersionDocumentoResponse(
            id=v.id,
            documento_id=v.documento_id,
            version=v.version,
            archivo_nombre_original=v.archivo_nombre_original,
            tamanio_bytes=v.tamanio_bytes,
            archivado=v.archivado,
            es_vigente=v.es_vigente,
            fecha_vigencia=v.fecha_vigencia,
            creado_el=v.creado_el,
            url_descarga=f"/documentos/archivo/{v.id}",
        )
        for v in versiones
    ]

@router.get(
    "/archivo/{version_id}",
    response_class=FileResponse,
)
def descargar_archivo_endpoint(
    version_id: int,
    db: Session = Depends(get_db),
):
    ruta, nombre_original = services.obtener_archivo_version(db, version_id)
    return FileResponse(
        path=ruta,
        media_type="application/pdf",
        filename=nombre_original,
    )
