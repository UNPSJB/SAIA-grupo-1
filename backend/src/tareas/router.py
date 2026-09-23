import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.tareas import schemas, services


router = APIRouter(prefix="/tareas", tags=["tareas"])



@router.post("/", response_model=schemas.Tarea)
async def create_tarea(tarea: schemas.TareaCreate, db: Session = Depends(get_db)):
    return services.crear_tarea(db, tarea)

@router.get("/", response_model=list[schemas.Tarea])
async def read_tareas(db: Session = Depends(get_db)):
    return services.listar_tareas(db)

@router.get("/{tarea_id}", response_model=schemas.Tarea)
async def read_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.obtener_tarea(db, tarea_id)

@router.put("/{tarea_id}", response_model=schemas.Tarea)
async def editar_tarea(tarea_id: int, tarea: schemas.TareaUpdate, db: Session = Depends(get_db)):
    return services.editar_tarea(db, tarea_id, tarea)


@router.delete("/{tarea_id}", response_model=schemas.Tarea)
def delete_tarea(tarea_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tarea(db, tarea_id)