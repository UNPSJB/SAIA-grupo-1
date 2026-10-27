import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.tareas.models import Tarea
from src.tareas.services import validar_personal
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.plan_De_limpieza import schemas, exceptions
from src.equipos.services import obtener_equipo
from src.sectores.services import obtener_sector

def obtener_planes_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    frecuencia: Optional[str] = None,
    tareas_filtro: Optional[str] = None
) -> List[Dict[str, Any]]:
    planes = listar_planes(db)
    filas = []
    
    for p in planes:
        # Resolver alcance (Equipo o Sector)
        alcance = "-"
        nombre_equipo = p.equipo.nombre if getattr(p, "equipo", None) else ""
        nombre_sector = p.sector.nombre if getattr(p, "sector", None) else ""
        
        if nombre_equipo:
            alcance = f"Equipo: {nombre_equipo}"
        elif nombre_sector:
            alcance = f"Sector: {nombre_sector}"

        # Obtener tareas y frecuencias asociadas
        tareas = getattr(p, "tareas", []) or []
        cant_tareas = len(tareas)
        
        lista_frecuencias = [
            str(getattr(t, "frecuencia", "") or "").upper()
            for t in tareas if getattr(t, "frecuencia", None)
        ]
        
        frecuencias_unicas = list(set(lista_frecuencias))
        frecuencia_str = ", ".join(frecuencias_unicas) if frecuencias_unicas else "Sin frecuencia"

        nombre_plan = getattr(p, "nombre", f"Plan #{p.id}") or ""

        # --- APLICACIÓN DE FILTROS ---
        if busqueda:
            term = busqueda.lower().strip()
            coincide = (
                term in nombre_plan.lower()
                or term in nombre_equipo.lower()
                or term in nombre_sector.lower()
            )
            if not coincide:
                continue

        if frecuencia and frecuencia != "TODOS":
            if frecuencia.upper() not in lista_frecuencias:
                continue

        if tareas_filtro and tareas_filtro != "TODOS":
            if tareas_filtro == "CON_TAREAS" and cant_tareas == 0:
                continue
            if tareas_filtro == "SIN_TAREAS" and cant_tareas > 0:
                continue

        filas.append({
            "id": p.id,
            "nombre": nombre_plan,
            "alcance": alcance,
            "frecuencia": frecuencia_str,
            "cant_tareas": cant_tareas,
            "descripcion": getattr(p, "descripcion", "") or "",
        })
        
    return filas

def crear_plan(db: Session, plan: schemas.PlanDeLimpiezaCreate) -> schemas.PlanDeLimpieza:
    if plan.equipo_id is not None:
        obtener_equipo(db, plan.equipo_id)
    if plan.sector_id is not None:
        obtener_sector(db, plan.sector_id)

    datos_plan = plan.model_dump()
    tareas_data = datos_plan.pop("tareas", [])
    for t in tareas_data:
        validar_personal(db, t["personal_id"])

    

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