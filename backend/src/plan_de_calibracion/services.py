from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.plan_de_calibracion import schemas, exceptions
from src.plan_de_calibracion.models import Plan_de_Calibracion

def obtener_planes_para_exportar(
    db: Session,
    busqueda: Optional[str] = None,
    estado: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = select(Plan_de_Calibracion)
    planes = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None
    hoy = date.today()

    for p in planes:
        nombre_plan = getattr(p, "nombre", "") or f"Plan #{p.id}"

        # Resolver nombre de equipo asociado
        nombre_equipo = "-"
        if getattr(p, "equipo", None):
            nombre_equipo = getattr(p.equipo, "nombre", "") or "-"

        # Obtener y normalizar fechas
        f_mantenimiento = getattr(p, "fecha_mantenimiento", None)
        f_vencimiento = getattr(p, "fecha_vencimiento", None)

        f_mant_date = f_mantenimiento.date() if isinstance(f_mantenimiento, datetime) else f_mantenimiento
        f_venc_date = f_vencimiento.date() if isinstance(f_vencimiento, datetime) else f_vencimiento

        str_mantenimiento = f_mant_date.strftime("%d/%m/%Y") if f_mant_date else "No aplica"
        str_vencimiento = f_venc_date.strftime("%d/%m/%Y") if f_venc_date else "No aplica"
        str_vencimiento_iso = f_venc_date.strftime("%Y-%m-%d") if f_venc_date else ""

        # Calcular estado de vencimiento (misma lógica exacta que el frontend)
        fecha_base = f_venc_date or f_mant_date
        if not fecha_base:
            estado_plan = "SIN_FECHA"
        else:
            diff_dias = (fecha_base - hoy).days
            if diff_dias < 0:
                estado_plan = "VENCIDOS"
            else:
                periodicidad_val = getattr(p, "periodicidad_De_cambio", None)
                periodo = periodicidad_val if isinstance(periodicidad_val, int) and periodicidad_val > 0 else 0
                if not periodo and f_venc_date and f_mant_date:
                    diff_periodo = (f_venc_date - f_mant_date).days
                    if diff_periodo > 0:
                        periodo = diff_periodo
                dias_alerta = max(round(periodo * 0.1), 2)
                estado_plan = "PROXIMOS" if diff_dias < dias_alerta else "AL_DIA"

        # Aplicar filtro por estado
        if estado and estado != "TODOS" and estado_plan != estado:
            continue

        # Aplicar filtro por término de búsqueda
        if term:
            coincide = (
                term in nombre_plan.lower()
                or term in nombre_equipo.lower()
                or term in str_vencimiento.lower()
                or term in str_vencimiento_iso.lower()
            )
            if not coincide:
                continue

        filas.append({
            "id": p.id,
            "nombre": nombre_plan,
            "equipo": nombre_equipo,
            "fecha_mantenimiento": str_mantenimiento,
            "fecha_vencimiento": str_vencimiento,
            "periodicidad_dias": getattr(p, "periodicidad_De_cambio", "") or "Sin especificar",
        })

    return filas

def calcular_fecha_vencimiento(fecha_mantenimiento: datetime, periodicidad: Optional[int]) -> Optional[datetime]:
    if periodicidad is not None and periodicidad > 0:
            return fecha_mantenimiento + timedelta(days=periodicidad)
    return None

def crear_plan(db: Session, plan: schemas.PlanDeCalibracionCreate) -> Plan_de_Calibracion:
    # Verificar si el equipo ya posee un plan de calibración asignado
    existente = db.scalar(
        select(Plan_de_Calibracion).where(Plan_de_Calibracion.equipo_id == plan.equipo_id)
    )
    if existente:
        raise exceptions.PoseePlan

    _plan = Plan_de_Calibracion(**plan.model_dump())
    _plan.fecha_vencimiento = calcular_fecha_vencimiento(_plan.fecha_mantenimiento, _plan.periodicidad_De_cambio)
    
    try:
        db.add(_plan)
        db.commit()
        db.refresh(_plan)
        return _plan
    except IntegrityError:
        db.rollback()
        raise exceptions.PoseePlan

def listar_planes(db:Session)->List[schemas.PlanDeCalibracion]:
    return list(db.scalars(select(Plan_de_Calibracion)).all())


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