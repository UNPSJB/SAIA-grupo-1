from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.checklist import schemas, services
from src.database import get_db

router = APIRouter(prefix="/checklist", tags=["Checklist"])


@router.post(
    "/generar",
    response_model=schemas.Checklist,
    status_code=status.HTTP_201_CREATED,
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
):
    return services.listar_checklists(
        db,
        fecha=fecha,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
    )


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
):
    return services.obtener_checklist(db, checklist_id)


@router.get(
    "/{checklist_id}/tareas/{item_id}",
    response_model=schemas.ChecklistItem,
)
async def obtener_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
):
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
):
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
):
    return services.guardar_archivo_imagen_tarea(db, checklist_id, item_id, file)


@router.delete(
    "/{checklist_id}/tareas/{item_id}/imagen",
    response_model=schemas.ChecklistItem,
)
async def eliminar_imagen_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
):
    return services.eliminar_imagen_tarea(db, checklist_id, item_id)
