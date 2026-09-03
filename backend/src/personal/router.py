import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/personal", tags=["personal"])

# Rutas para Personal


@router.post("/", response_model=schemas.Personal)
def create_persona(personal: schemas.PersonalCreate, db: Session = Depends(get_db)):
    return services.crear_personal(db, personal)


@router.get("/", response_model=list[schemas.Personal])
def read_personal(db: Session = Depends(get_db)):
    logger.info("Consultando la lista de personal desde endpoint...")  # <- este mensaje se verá por la terminal
    return services.listar_personal(db)


@router.get("/{personal_legajo}", response_model=schemas.Personal)
def read_persona(personal_legajo: int, db: Session = Depends(get_db)):
    return services.leer_personal(db, personal_legajo)


@router.put("/{personal_legajo}", response_model=schemas.Personal)
def update_personal(
    persona_legajo: int, personal: schemas.PersonalUpdate, db: Session = Depends(get_db)
):
    return services.modificar_personal(db, persona_legajo, personal)


@router.delete("/{personal_legajo}", response_model=schemas.Personal)
def delete_persona(personal_legajo: int, db: Session = Depends(get_db)):
    return services.eliminar_persona(db, personal_legajo)
