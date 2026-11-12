from datetime import date

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile,status
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.autenticacion.dependencies import requiere_admin, get_usuario_actual,requiere_operador,es_administrador
from src.database import get_db
from src.recetas import schemas, services, exceptions
from src.exceptions import PermissionDenied



router = APIRouter(prefix="/recetas", tags=["recetas"])



def _verificar_acceso_checklist_receta(
    db: Session, checklist_id: int, usuario: Personal
) -> None:
    if es_administrador(usuario):
        return
    checklist = services.obtener_checklist_receta(db, checklist_id)
    if checklist.responsable_legajo != usuario.legajo:
        raise PermissionDenied()


def _verificar_etapa_propia(
    db: Session, checklist_id: int, etapa_id: int, usuario: Personal
) -> None:
    checklist = services.obtener_checklist_receta(db, checklist_id)
    if checklist.responsable_legajo != usuario.legajo:
        raise PermissionDenied()
    etapa = services.obtener_etapa_checklist(db, checklist_id, etapa_id)
    if etapa.responsable_legajo is not None and etapa.responsable_legajo != usuario.legajo:
        raise PermissionDenied()


@router.post(
    "/checklist/generar",
    response_model=schemas.ChecklistRecetaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generar_checklist_receta_endpoint(
    datos: schemas.ChecklistRecetaGenerar,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    datos = datos.model_copy(update={"responsable_legajo": usuario.legajo})
    return services.generar_checklist_receta(db, datos)


@router.get(
    "/checklist",
    response_model=List[schemas.ChecklistRecetaResponse],
)
async def listar_checklists_receta_endpoint(
    fecha: Optional[date] = Query(None),
    estado: Optional[str] = Query(None),
    responsable_legajo: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    if not es_administrador(usuario):
        responsable_legajo = usuario.legajo
    return services.listar_checklists_receta(
        db,
        fecha=fecha,
        estado=estado,
        responsable_legajo=responsable_legajo,
    )


@router.get(
    "/checklist/{checklist_id}",
    response_model=schemas.ChecklistRecetaResponse,
)
async def obtener_checklist_receta_endpoint(
    checklist_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    _verificar_acceso_checklist_receta(db, checklist_id, usuario)
    return services.obtener_checklist_receta(db, checklist_id)


@router.post(
    "/checklist/{checklist_id}/etapas/{etapa_id}/completar",
    response_model=schemas.ChecklistRecetaItemResponse,
)
async def completar_etapa_receta_endpoint(
    checklist_id: int,
    etapa_id: int,
    datos: Optional[schemas.CompletarEtapaSchema] = None,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    _verificar_etapa_propia(db, checklist_id, etapa_id, usuario)
    return services.completar_etapa_checklist(
        db, checklist_id, etapa_id, usuario.legajo, datos
    )


@router.post(
    "/checklist/{checklist_id}/etapas/{etapa_id}/no-realizada",
    response_model=schemas.ChecklistRecetaItemResponse,
)
async def marcar_etapa_no_realizada_endpoint(
    checklist_id: int,
    etapa_id: int,
    datos: schemas.MarcarEtapaNoRealizadaSchema,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    _verificar_etapa_propia(db, checklist_id, etapa_id, usuario)
    return services.marcar_etapa_no_realizada(
        db, checklist_id, etapa_id, datos, usuario.legajo
    )

def obtener_usuario_actual(request: Request,db: Session = Depends(get_db),usuario_auth: Personal = Depends(requiere_admin),
) -> Personal:
    legajo_header = request.headers.get("X-User-Legajo")
    if legajo_header:
        persona = db.scalar(select(Personal).where(Personal.legajo == int(legajo_header)))
        if persona:
            if not persona.activo:
                raise exceptions.ResponsableInactivo()
            if persona.capacidad not in (Capacidades.ADMINISTRAR, Capacidades.AMBAS):
                raise exceptions.SoloAdministradorPuedeSubir()
            return persona

    if isinstance(usuario_auth, Personal):
        return usuario_auth

    if hasattr(usuario_auth, "legajo"):
        persona = db.scalar(select(Personal).where(Personal.legajo == usuario_auth.legajo))
        if persona:
            return persona

    return usuario_auth

@router.post("/", response_model=schemas.Receta,status_code=status.HTTP_201_CREATED)
async def create_receta(receta: schemas.RecetaCreate, db: Session = Depends(get_db),usuario: Personal = Depends(obtener_usuario_actual)):
    return services.crear_receta(db, receta,usuario=usuario)

@router.get("/", response_model=List[schemas.Receta], status_code=status.HTTP_200_OK)
async def read_recetas(db: Session = Depends(get_db),usuario: Personal = Depends(obtener_usuario_actual)):
    return services.listar_recetas(db,usuario=usuario)

@router.get("/{receta_id}", response_model=schemas.Receta, status_code=status.HTTP_200_OK)
async def read_receta(receta_id: int, db: Session = Depends(get_db),usuario: Personal = Depends(obtener_usuario_actual)):
    return services.obtener_receta(db, receta_id, usuario=usuario)

@router.put("/{receta_id}", response_model=schemas.Receta, status_code=status.HTTP_200_OK)
async def update_receta(receta_id: int, receta: schemas.RecetaUpdate, db: Session = Depends(get_db),usuario: Personal = Depends(obtener_usuario_actual)):
    return services.editar_receta(db, receta_id, receta,usuario=usuario)


def _serializar_version(v) -> Optional[schemas.VersionRecetaResponse]:
    if not v:
        return None
    return schemas.VersionRecetaResponse(
        id=v.id,
        receta_id=v.receta_id,
        version=v.version,
        #archivo_nombre_original=v.archivo_nombre_original,
        #tamanio_bytes=v.tamanio_bytes,
        #tamanio_formateado=v.tamanio_formateado,
        archivado=v.archivado,
        es_vigente=v.es_vigente,
        fecha_vigencia=v.fecha_vigencia,
        fecha_vencimiento=v.fecha_vencimiento,
       # fecha_archivo=v.fecha_archivo,
        usuario=v.usuario,
        creado_el=v.creado_el,
        #url_descarga=f"/documentos/archivo/{v.id}",
        #url_previsualizacion=f"/documentos/archivo/{v.id}?inline=true",
    )



@router.get("/{receta_id}/versiones", response_model=List[schemas.VersionRecetaResponse])
async def listar_versiones_receta(
    receta_id: int,
    db: Session = Depends(get_db),
):
    return services.listar_versiones_receta(db, receta_id)
