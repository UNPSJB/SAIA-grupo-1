from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.plan_de_calibracion import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv
from typing import Optional

router = APIRouter(prefix="/plan_de_calibracion", tags=["plan_de_calibracion"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_planes_calibracion_csv(
    busqueda: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_planes_para_csv(db, busqueda=busqueda)

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Plan",
        "equipo": "Equipo Asociado",
        "fecha_mantenimiento": "Fecha de Mantenimiento",
        "fecha_vencimiento": "Fecha de Vencimiento",
        "periodicidad_dias": "Periodicidad (Días)",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="planes_de_calibracion.csv",
    )

@router.post("/", response_model=schemas.PlanDeCalibracion)
async def create_plan(planC: schemas.PlanDeCalibracionCreate, db:Session=Depends(get_db)):
    return services.crear_plan(db,planC)

@router.get("/", response_model=list[schemas.PlanDeCalibracion])
async def read_planes(db:Session=Depends(get_db)):
    return services.listar_planes(db)


@router.get("/{plan_id}",response_model=schemas.PlanDeCalibracion)
async def read_plan(plan_id:int,db:Session=Depends(get_db)):
    return services.Obtener_plan(db,plan_id)

@router.put("/{plan_id}",response_model=schemas.PlanDeCalibracion)
async def update_plan(plan_id:int,planC:schemas.PlanDeCalibracionUpdate,db:Session=Depends(get_db)):
    return services.editar_plan(db,plan_id,planC)

@router.post("/{plan_id}/vencimiento", response_model=schemas.PlanDeCalibracion)
async def efectuar_vencimiento(plan_id: int, db: Session = Depends(get_db)):
    return services.registrar_vencimiento_fecha(db, plan_id)