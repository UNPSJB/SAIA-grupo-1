from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from src.database import get_db
from . import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv 

router = APIRouter()

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_personal_csv(
    busqueda: Optional[str] = None,
    capacidad: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_personal_para_csv(
        db, busqueda=busqueda, capacidad=capacidad, estado=estado
    )

    columnas = {
        "legajo": "Legajo",
        "documento": "DNI / Documento",
        "nombre_completo": "Nombre Completo",
        "usuario": "Usuario",
        "email": "Correo Electrónico",
        "capacidad": "Capacidad",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="personal.csv",
    )

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