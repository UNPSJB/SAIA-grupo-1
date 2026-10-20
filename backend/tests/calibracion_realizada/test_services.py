from datetime import datetime, timedelta
import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.plan_de_calibracion.schemas import PlanDeCalibracionCreate
from src.plan_de_calibracion.services import crear_plan
from src.calibracion_realizada import exceptions, schemas, services

def _crear_plan_aux(session: Session, equipo_id: int = 1):
    return crear_plan(
        session,
        PlanDeCalibracionCreate(
            nombre="Plan Para Calibracion Realizada",
            periodicidad_De_cambio=90,
            fecha_mantenimiento=datetime.now() + timedelta(days=2),
            descripcion="Plan aux",
            equipo_id=equipo_id,
        ),
    )

def test_registrar_y_obtener_calibracion_realizada(session: Session):
    plan = _crear_plan_aux(session, 1)
    fecha_cal = datetime.now() + timedelta(minutes=5)
    cal_data = schemas.CalibracionRealizadaCreate(
        fecha_d_realizacion=fecha_cal,
        formato_archivo="certificado_balanza.pdf",
        plan_calibracion_id=plan.id,
    )
    creada = services.calibracion_realizada(session, cal_data)
    assert creada.id is not None
    assert creada.plan_calibracion_id == plan.id
    assert creada.formato_archivo == "certificado_balanza.pdf"

    obtenida = services.Obtener_CalibracionRealizada(session, creada.id)
    assert obtenida.id == creada.id

def test_listar_calibraciones_realizadas(session: Session):
    plan = _crear_plan_aux(session, 1)
    cal_data = schemas.CalibracionRealizadaCreate(
        fecha_d_realizacion=datetime.now() + timedelta(minutes=5),
        formato_archivo="cert_test.pdf",
        plan_calibracion_id=plan.id,
    )
    services.calibracion_realizada(session, cal_data)
    lista = services.listar_calibraciones_realizadas(session)
    assert len(lista) >= 1

def test_obtener_calibracion_inexistente_falla(session: Session):
    with pytest.raises(exceptions.Calibracion_No_Encontrada):
        services.Obtener_CalibracionRealizada(session, 99999)

def test_validaciones_schemas_calibracion_realizada():
    pasado = datetime.now() - timedelta(days=1)
    with pytest.raises(exceptions.FECHA_ERROR):
        schemas.CalibracionRealizadaCreate.validar_fecha_d_realizacion(pasado)
