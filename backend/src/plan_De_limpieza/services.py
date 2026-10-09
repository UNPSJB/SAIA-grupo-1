import logging
from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.tareas.models import Tarea
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.plan_De_limpieza import schemas, exceptions
from src.equipos.services import obtener_equipo
from src.sectores.services import obtener_sector

def crear_plan(db: Session, plan: schemas.PlanDeLimpiezaCreate) -> schemas.PlanDeLimpieza:
    if plan.equipo_id is not None:
        obtener_equipo(db, plan.equipo_id)
    if plan.sector_id is not None:
        obtener_sector(db, plan.sector_id)

    datos_plan = plan.model_dump()
    tareas_data = datos_plan.pop("tareas", [])

    _plan = Plan_de_Limpieza(**datos_plan)
    db.add(_plan)
    db.flush()

    if len(tareas_data) > 0:
        for t in tareas_data:
            t["plan_id"] = _plan.id
            nueva_tarea = Tarea(**t)
            db.add(nueva_tarea)

    db.commit()
    db.refresh(_plan)
    return _plan

def listar_planes(db: Session) -> List[schemas.PlanDeLimpieza]:
    return list(db.scalars(select(Plan_de_Limpieza)).all())

def obtener_plan(db: Session, plan_id: int) -> schemas.PlanDeLimpieza:
    db_plan = db.scalar(select(Plan_de_Limpieza).where(Plan_de_Limpieza.id == plan_id))
    if db_plan is None:
        raise exceptions.PlanNoEncontrado()
    return db_plan

def editar_plan(db: Session, plan_id: int, plan: schemas.PlanDeLimpiezaUpdate) -> schemas.PlanDeLimpieza:
    db_plan = obtener_plan(db, plan_id)
    datos = plan.model_dump(exclude_unset=True)
    if "equipo_id" in datos and datos["equipo_id"] is not None:
        obtener_equipo(db, datos["equipo_id"])
    if "sector_id" in datos and datos["sector_id"] is not None:
        obtener_sector(db, datos["sector_id"])
    if datos:
        db.execute(
            update(Plan_de_Limpieza).where(Plan_de_Limpieza.id == plan_id).values(**datos)
        )
        db.commit()
        db.refresh(db_plan)
    return db_plan