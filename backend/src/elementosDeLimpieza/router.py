import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.elementosDeLimpieza import schemas, services

router = APIRouter(prefix="/elementosDeLimpieza", tags=["elementosDeLimpieza"])

@router.post("/", response_model=schemas.ElementoDeLimpieza)
async def create_elementoDeLimpieza(equipo: schemas.ElementoDeLimpiezaCreate, db: Session = Depends(get_db)):
    return services.crear_elementoDeLimpieza(db, equipo)

@router.get("/", response_model=list[schemas.ElementoDeLimpieza])
async def read_elementosDeLimpieza(db: Session = Depends(get_db)):
    return services.listar_elementosDeLimpiezas(db)

@router.get("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpieza)
async def read_elementoDeLimpieza(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)

@router.put("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpiezaUpdate)
async def update_elementoDeLimpieza(elementoDeLimpieza_id: int, elementoDeLimpieza: schemas.ElementoDeLimpiezaUpdate, db: Session = Depends(get_db)):
    return services.editar_elementoDeLimpieza(db, elementoDeLimpieza_id, elementoDeLimpieza)

@router.delete("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpieza)
async def delete_elementoDeLimpieza(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.eliminar_elementoDeLimpieza(db, elementoDeLimpieza_id)

@router.post("/{elementoDeLimpieza_id}/cambiar", response_model=schemas.ElementoDeLimpieza)
async def efectuar_cambio(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.registrar_cambio_fecha(db, elementoDeLimpieza_id)