from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from . import schemas, services

# Esta es la variable que busca main.py:
router = APIRouter()

@router.get("/", response_model=List[schemas.Personal])
def read_personal(db: Session = Depends(get_db)):
    return services.listar_personal(db)

@router.post("/", response_model=schemas.Personal, status_code=status.HTTP_201_CREATED)
def create_persona(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)

@router.get("/{legajo}", response_model=schemas.Personal)
def read_persona_by_legajo(legajo: int, db: Session = Depends(get_db)):
    return services.obtener_personal_por_legajo(db, legajo)

@router.put("/{legajo}", response_model=schemas.Personal)
def update_persona(legajo: int, personal: schemas.PersonalUpdate, db: Session = Depends(get_db)):
    return services.actualizar_personal(db, legajo, personal)