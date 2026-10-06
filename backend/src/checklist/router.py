from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import (
    es_administrador,
    get_usuario_actual,
    requiere_admin,
    requiere_operador,
)
from src.checklist import schemas, services
from src.database import get_db
from src.exceptions import PermissionDenied
from src.personal.models import Personal

router = APIRouter(prefix="/checklist", tags=["Checklist"])


def _verificar_acceso(db: Session, checklist_id: int, usuario: Personal) -> None:
    """Un operador solo accede al checklist del día; el historial es del administrador."""
    if es_administrador(usuario):
        return
    checklist = services.obtener_checklist(db, checklist_id)
    if checklist.fecha != date.today():
        raise PermissionDenied()


@router.post(
    "/generar",
    response_model=schemas.Checklist,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_admin)],
)
async def generar_checklist_endpoint(
    datos: schemas.ChecklistGenerar,
    db: Session = Depends(get_db),
):
    return services.generar_checklist(db, datos)


@router.get(
    "/",
    response_model=List[schemas.Checklist],
)
async def listar_checklists_endpoint(
    fecha: Optional[date] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    if not es_administrador(usuario):
        # el operador solo ve el checklist del día, sin importar los filtros que mande
        fecha, fecha_desde, fecha_hasta = date.today(), None, None
    return services.listar_checklists(
        db,
        fecha=fecha,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
    )


# Pública a propósito: el navegador pide las fotos con <img src=...> y no puede mandar
# el token. Los nombres de archivo llevan un sufijo aleatorio (uuid) que no se puede adivinar.
@router.get(
    "/imagenes/{nombre_archivo}",
    response_class=FileResponse,
)
async def obtener_imagen_endpoint(
    nombre_archivo: str,
):
    return services.obtener_archivo_imagen(nombre_archivo)


@router.get(
    "/{checklist_id}",
    response_model=schemas.Checklist,
)
async def obtener_checklist_endpoint(
    checklist_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    _verificar_acceso(db, checklist_id, usuario)
    return services.obtener_checklist(db, checklist_id)


@router.get(
    "/{checklist_id}/tareas/{item_id}",
    response_model=schemas.ChecklistItem,
)
async def obtener_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    _verificar_acceso(db, checklist_id, usuario)
    return services.obtener_tarea(db, checklist_id, item_id)



@router.post(
    "/{checklist_id}/tareas/{item_id}/completar",
    response_model=schemas.ChecklistItem,
)
async def completar_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    datos: schemas.CompletarTareaSchema,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    _verificar_acceso(db, checklist_id, usuario)
    # La autoría la define la sesión, no el cliente: nadie puede completar una tarea a nombre de otro.
    datos = datos.model_copy(update={"responsable_legajo": usuario.legajo})
    return services.completar_tarea(db, checklist_id, item_id, datos)


@router.post(
    "/{checklist_id}/tareas/{item_id}/imagen",
    response_model=schemas.ChecklistItem,
)
async def subir_imagen_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    _verificar_acceso(db, checklist_id, usuario)
    return services.guardar_archivo_imagen_tarea(db, checklist_id, item_id, file)


@router.delete(
    "/{checklist_id}/tareas/{item_id}/imagen",
    response_model=schemas.ChecklistItem,
)
async def eliminar_imagen_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    _verificar_acceso(db, checklist_id, usuario)
    return services.eliminar_imagen_tarea(db, checklist_id, item_id)
