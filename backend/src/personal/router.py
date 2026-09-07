from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal import schemas, services

router = APIRouter(tags=["personal"])

@router.get("", response_model=list[schemas.Personal])
@router.get("/", response_model=list[schemas.Personal])
def read_personal(db: Session = Depends(get_db)):
    return services.listar_personal(db)

@router.post("", response_model=schemas.Personal)
@router.post("/", response_model=schemas.Personal)
def create_persona(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)

@router.get("/{personal_legajo}", response_model=schemas.Personal)
def read_persona(personal_legajo: int, db: Session = Depends(get_db)):
    return services.leer_personal(db, personal_legajo)

@router.put("/{personal_legajo}", response_model=schemas.Personal)
def update_personal(personal_legajo: int, personal: schemas.PersonalUpdate, db: Session = Depends(get_db)):
    return services.modificar_personal(db, personal_legajo, personal)

@router.delete("/{personal_legajo}", response_model=schemas.Personal)
def delete_persona(personal_legajo: int, db: Session = Depends(get_db)):
    return services.eliminar_persona(db, personal_legajo)