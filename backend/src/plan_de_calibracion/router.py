from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.plan_de_calibracion import schemas, services


router = APIRouter(prefix="/plan_de_calibracion", tags=["plan_de_calibracion"])


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