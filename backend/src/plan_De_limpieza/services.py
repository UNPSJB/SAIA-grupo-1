import logging
from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.plan_De_limpieza import schemas, exceptions




# CRUD DE Plan DE Limpieza

def crear_plan(db: Session, plan: schemas.PlanDeLimpiezaCreate) -> schemas.PlanDeLimpieza:
    _plan = Plan_de_Limpieza(**plan.model_dump())
    db.add(_plan)
    db.commit()
    db.refresh(_plan)
    return _plan

def listar_planes(db: Session) -> List[schemas.PlanDeLimpieza]:
    return db.scalars(select(Plan_de_Limpieza)).all() 

def obtener_plan(db: Session, plan_id: int) -> schemas.PlanDeLimpieza:
    db_plan = db.scalar(select(Plan_de_Limpieza).where(Plan_de_Limpieza.id == plan_id))
    if db_plan is None:
        raise exceptions.PlanNoEncontrado()
    return db_plan

def editar_plan(db: Session, plan_id: int, plan: schemas.PlanDeLimpiezaUpdate) -> schemas.PlanDeLimpieza:
    db_plan = obtener_plan(db, plan_id)
    db.execute(
        update(Plan_de_Limpieza).where(Plan_de_Limpieza.id == plan_id).values(**plan.model_dump())
    )
    db.commit()
    db.refresh(db_plan)
    return db_plan