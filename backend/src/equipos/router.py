import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services


router = APIRouter(prefix="/equipos", tags=["equipos"])



@router.post("/", response_model=schemas.Equipo)
async def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)

@router.get("/", response_model=list[schemas.Equipo])
async def read_equipos(db: Session = Depends(get_db)):
    return services.listar_equipos(db)

@router.get("/{equipo_id}", response_model=schemas.Equipo)
async def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_equipo(db, equipo_id)

@router.put("/{equipo_id}", response_model=schemas.Equipo)
async def editar_equipo(equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)):
    return services.editar_equipo(db, equipo_id, equipo)

@router.delete("/{equipo_id}", response_model=schemas.Equipo)
async def eliminar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_equipo(db, equipo_id)