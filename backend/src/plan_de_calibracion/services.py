
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.plan_de_calibracion import schemas, exceptions
from src.plan_de_calibracion.models import Plan_de_Calibracion


def calcular_fecha_vencimiento(fecha_mantenimiento: datetime, periodicidad: Optional[int]) -> Optional[datetime]:
    if periodicidad is not None and periodicidad > 0:
            return fecha_mantenimiento + timedelta(days=periodicidad)
    return None

def crear_plan(db:Session, plan:schemas.PlanDeCalibracionCreate)->schemas.PlanDeCalibracion:
    _plan=Plan_de_Calibracion(**plan.model_dump())

    _plan.fecha_vencimiento = calcular_fecha_vencimiento(_plan.fecha_mantenimiento, _plan.periodicidad_De_cambio)
    db.add(_plan)
    db.commit()
    db.refresh(_plan)
    return _plan

def listar_planes(db:Session)->List[schemas.PlanDeCalibracion]:
    return db.scalars(select(Plan_de_Calibracion)).all()


def Obtener_plan(db:Session,plan_id:int)->schemas.PlanDeCalibracion:
    db_plan=db.scalar(select(Plan_de_Calibracion).where(Plan_de_Calibracion.id==plan_id))
    if db_plan is None:
        raise exceptions.PlanNoEncontrado()
    return db_plan

def editar_plan(db:Session,plan_id:int,plan:schemas.PlanDeCalibracionUpdate)->schemas.PlanDeCalibracion:
    db_plan=Obtener_plan(db,plan_id)
    datos=plan.model_dump(exclude_unset=True)


    if "periodicidad_De_cambio" in datos:
        nueva_periodicidad = datos["periodicidad_De_cambio"]
        periodicidad_anterior = db_plan.periodicidad_De_cambio

        if nueva_periodicidad != periodicidad_anterior:
            datos["fecha_vencimiento"] = calcular_fecha_vencimiento(db_plan.fecha_mantenimiento, nueva_periodicidad)
        else:
            datos.pop("fecha_vencimiento", None)
    
    db.execute(
            update(Plan_de_Calibracion).where(Plan_de_Calibracion.id==plan_id).values(**datos)
        )
    db.commit()
    db.refresh(db_plan)
    return db_plan


def registrar_vencimiento_fecha(db: Session, plan_id: int) -> schemas.PlanDeCalibracion:
    db_plan = Obtener_plan(db, plan_id)
    db_plan.fecha_vencimiento = calcular_fecha_vencimiento(db_plan.fecha_mantenimiento, db_plan.periodicidad_De_cambio)
    db.execute(
        update(Plan_de_Calibracion).where(Plan_de_Calibracion.id == plan_id).values(fecha_vencimiento=db_plan.fecha_vencimiento)
    )
    db.commit()
    db.refresh(db_plan)
    return db_plan