from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.personal import schemas, services

router = APIRouter(tags=["Personal"])

@router.post("/", response_model=schemas.Personal, status_code=status.HTTP_201_CREATED)
def create_persona(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)

@router.get("/", response_model=List[schemas.Personal])
def read_personal(db: Session = Depends(get_db)):
    return services.listar_personal(db)

@router.get("/{personal_legajo}", response_model=schemas.Personal)
def read_persona(personal_legajo: int, db: Session = Depends(get_db)):
    persona = services.leer_personal(db, personal_legajo)
    if not persona:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return persona

@router.put("/{personal_legajo}", response_model=schemas.Personal)
def update_persona(
    personal_legajo: int,
    personal: schemas.PersonalUpdate,
    db: Session = Depends(get_db)
):
    actualizado = services.modificar_personal(db, personal_legajo, personal)
    if not actualizado:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return actualizado

@router.delete("/{personal_legajo}", response_model=schemas.Personal)
def delete_persona(personal_legajo: int, db: Session = Depends(get_db)):
    eliminado = services.eliminar_persona(db, personal_legajo)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return eliminado