from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.calibracion_realizada import schemas, exceptions
from src.calibracion_realizada.models import Calibracion_Realizada
from src.plan_de_calibracion.services import calcular_fecha_vencimiento, Obtener_plan



def calibracion_realizada(db:Session, cal:schemas.CalibracionRealizadaCreate)->schemas.CalibracionRealizada:
    _cal=Calibracion_Realizada(**cal.model_dump())
    db_plan=Obtener_plan(db,_cal.plan_calibracion_id)

    db_plan.fecha_vencimiento = calcular_fecha_vencimiento(_cal.fecha_d_realizacion, db_plan.periodicidad_De_cambio)
    db.add(_cal)
    db.commit()
    db.refresh(_cal)
    return _cal


def listar_calibraciones_realizadas(db:Session)->List[schemas.CalibracionRealizada]:
    return db.scalars(select(Calibracion_Realizada)).all()


def Obtener_CalibracionRealizada(db:Session,cal_id:int)->schemas.CalibracionRealizada:
    db_cal=db.scalar(select(Calibracion_Realizada).where(Calibracion_Realizada.id==cal_id))
    if db_cal is None:
        raise exceptions.Calibracion_No_Encontrada()
    return db_cal




