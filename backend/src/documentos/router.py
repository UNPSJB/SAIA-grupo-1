from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.documentos import schemas, services
from src.documentos.constants import TipoDocumento

router = APIRouter(prefix="/documentos", tags=["Documentos Versionados"])

@router.post(
    "",
    response_model=schemas.DocumentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_documento_endpoint(
    titulo: str = Form(...),
    tipo: TipoDocumento = Form(...),
    version: str = Form(...),
    responsable_legajo: int = Form(...),
    descripcion: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    doc = services.crear_documento(
        db=db,
        titulo=titulo,
        tipo=tipo,
        version=version,
        responsable_legajo=responsable_legajo,
        file=archivo,
        descripcion=descripcion,
    )
    v_actual = doc.version_actual
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
            responsable_legajo=v_actual.responsable_legajo,
            nombre_responsable=v_actual.nombre_responsable,
            archivado=v_actual.archivado,
            creado_el=v_actual.creado_el,
            url_descarga=f"/documentos/archivo/{v_actual.id}",
        ) if v_actual else None,
        total_versiones=len(doc.versiones),
    )

@router.post(
    "/{documento_id}/versiones",
    response_model=schemas.VersionDocumentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def subir_nueva_version_endpoint(
    documento_id: int,
    version: str = Form(...),
    responsable_legajo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    v = services.subir_nueva_version(
        db=db,
        documento_id=documento_id,
        version=version,
        responsable_legajo=responsable_legajo,
        file=archivo,
    )
    return schemas.VersionDocumentoResponse(
        id=v.id,
        documento_id=v.documento_id,
        version=v.version,
        archivo_nombre_original=v.archivo_nombre_original,
        tamanio_bytes=v.tamanio_bytes,
        responsable_legajo=v.responsable_legajo,
        nombre_responsable=v.nombre_responsable,
        archivado=v.archivado,
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
        v = d.version_actual
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
                responsable_nombre=v.nombre_responsable if v else None,
                responsable_legajo=v.responsable_legajo if v else None,
                archivo_nombre_original=v.archivo_nombre_original if v else None,
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
            responsable_legajo=v_actual.responsable_legajo,
            nombre_responsable=v_actual.nombre_responsable,
            archivado=v_actual.archivado,
            creado_el=v_actual.creado_el,
            url_descarga=f"/documentos/archivo/{v_actual.id}",
        ) if v_actual else None,
        total_versiones=len(doc.versiones),
    )

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
