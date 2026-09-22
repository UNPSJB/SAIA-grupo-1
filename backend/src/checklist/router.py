from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
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
    estado: Optional[str] = Query(None),
    incluir_inactivos: bool = Query(False),
    db: Session = Depends(get_db),
):
    return services.listar_checklists(
        db, fecha=fecha, estado=estado, incluir_inactivos=incluir_inactivos
    )


@router.get(
    "/{checklist_id}",
    response_model=schemas.Checklist,
)
async def obtener_checklist_endpoint(
    checklist_id: int,
    incluir_inactivos: bool = Query(False),
    db: Session = Depends(get_db),
):
    return services.obtener_checklist(
        db, checklist_id, incluir_inactivos=incluir_inactivos
    )


@router.patch(
    "/{checklist_id}/tareas/{item_id}",
    response_model=schemas.ChecklistItem,
)
async def actualizar_tarea_endpoint(
    checklist_id: int,
    item_id: int,
    datos: schemas.ChecklistItemUpdate,
    db: Session = Depends(get_db),
):
    return services.actualizar_tarea(db, checklist_id, item_id, datos)


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


@router.delete(
    "/{checklist_id}",
    response_model=schemas.Checklist,
)
async def eliminar_checklist_endpoint(
    checklist_id: int,
    db: Session = Depends(get_db),
):
    return services.eliminar_checklist(db, checklist_id)


@router.post(
    "/{checklist_id}/restaurar",
    response_model=schemas.Checklist,
)
async def restaurar_checklist_endpoint(
    checklist_id: int,
    db: Session = Depends(get_db),
):
    return services.restaurar_checklist(db, checklist_id)
