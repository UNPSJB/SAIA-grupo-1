import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.plan_De_limpieza import schemas, services
from src.utils.csv import generar_respuesta_csv
from src.autenticacion.dependencies import get_usuario_actual
from typing import Optional

router = APIRouter(prefix="/plan_De_limpieza", tags=["plan_De_limpieza"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_planes_csv(
    busqueda: Optional[str] = None,
    frecuencia: Optional[str] = None,
    tareas: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_planes_para_csv(
        db,
        busqueda=busqueda,
        frecuencia=frecuencia,
        tareas_filtro=tareas
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Plan",
        "alcance": "Equipo / Sector / Alcance",
        "frecuencia": "Frecuencia",
        "cant_tareas": "Cantidad de Tareas",
        "descripcion": "Descripción",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="planes_de_limpieza.csv",
    )

@router.post("/", response_model=schemas.PlanDeLimpieza)
async def create_plan(plan: schemas.PlanDeLimpiezaCreate, db: Session = Depends(get_db)):
    return services.crear_plan(db, plan)

@router.get("/", response_model=list[schemas.PlanDeLimpieza])
async def read_planes(db: Session = Depends(get_db)):
    return services.listar_planes(db)

@router.get("/{plan_id}", response_model=schemas.PlanDeLimpieza)
async def read_plan(plan_id: int, db: Session = Depends(get_db)):
    return services.obtener_plan(db, plan_id)

@router.put("/{plan_id}", response_model=schemas.PlanDeLimpieza)
async def editar_plan(plan_id: int, plan: schemas.PlanDeLimpiezaUpdate, db: Session = Depends(get_db)):
    return services.editar_plan(db, plan_id, plan)
