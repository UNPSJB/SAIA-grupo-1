from datetime import datetime, timedelta
import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.plan_de_calibracion import exceptions, schemas, services

def test_crear_y_obtener_plan_calibracion_service(session: Session):
    mantenimiento = datetime.now() + timedelta(days=2)
    plan_create = schemas.PlanDeCalibracionCreate(
        nombre="Calibracion Heladera Principal",
        periodicidad_De_cambio=90,
        fecha_mantenimiento=mantenimiento,
        descripcion="Calibracion semestral de sensores",
        equipo_id=1,
    )
    creado = services.crear_plan(session, plan_create)
    assert creado.id is not None
    assert creado.nombre == "Calibracion Heladera Principal"
    assert creado.fecha_vencimiento is not None
    assert creado.fecha_vencimiento > mantenimiento

    obtenido = services.Obtener_plan(session, creado.id)
    assert obtenido.id == creado.id

def test_listar_planes_calibracion_service(session: Session):
    mantenimiento = datetime.now() + timedelta(days=5)
    plan_create = schemas.PlanDeCalibracionCreate(
        nombre="Calibracion Freezer Dos",
        periodicidad_De_cambio=60,
        fecha_mantenimiento=mantenimiento,
        descripcion="Verificacion termostato",
        equipo_id=2,
    )
    services.crear_plan(session, plan_create)
    planes = services.listar_planes(session)
    assert len(planes) >= 1

def test_obtener_plan_inexistente_falla(session: Session):
    with pytest.raises(exceptions.PlanNoEncontrado):
        services.Obtener_plan(session, 99999)

def test_editar_plan_calibracion_service(session: Session):
    mantenimiento = datetime.now() + timedelta(days=1)
    plan_create = schemas.PlanDeCalibracionCreate(
        nombre="Calibracion Test Modif",
        periodicidad_De_cambio=30,
        fecha_mantenimiento=mantenimiento,
        descripcion="Revision",
        equipo_id=1,
    )
    creado = services.crear_plan(session, plan_create)
    venc_original = creado.fecha_vencimiento

    update_schema = schemas.PlanDeCalibracionUpdate(periodicidad_De_cambio=60)
    editado = services.editar_plan(session, creado.id, update_schema)
    assert editado.periodicidad_De_cambio == 60
    assert editado.fecha_vencimiento != venc_original

    with pytest.raises(exceptions.PlanNoEncontrado):
        services.editar_plan(session, 99999, update_schema)

def test_registrar_vencimiento_fecha_service(session: Session):
    mantenimiento = datetime.now() + timedelta(days=1)
    plan_create = schemas.PlanDeCalibracionCreate(
        nombre="Calibracion Test Recalculo",
        periodicidad_De_cambio=45,
        fecha_mantenimiento=mantenimiento,
        descripcion="Control",
        equipo_id=1,
    )
    creado = services.crear_plan(session, plan_create)
    recalculado = services.registrar_vencimiento_fecha(session, creado.id)
    assert recalculado.fecha_vencimiento is not None

    with pytest.raises(exceptions.PlanNoEncontrado):
        services.registrar_vencimiento_fecha(session, 99999)

def test_validaciones_schemas_plan_calibracion():
    pasado = datetime.now() - timedelta(days=2)
    with pytest.raises(exceptions.FechaAnterior):
        schemas.PlanDeCalibracionCreate.validar_fecha_mantenimiento(pasado)

    with pytest.raises(exceptions.NombreInvalido):
        schemas.PlanDeCalibracionCreate.validar_nombre("Plan @#$%")

    with pytest.raises(exceptions.NombreVacio):
        schemas.PlanDeCalibracionCreate.validar_longitud("X")

    with pytest.raises(exceptions.PeriodicidadInvalida):
        schemas.PlanDeCalibracionCreate.validar_periodicidad(0)

    with pytest.raises(exceptions.DescripcionVacia):
        schemas.PlanDeCalibracionCreate.validar_descripcion("")

    with pytest.raises(exceptions.FechaAnterior):
        schemas.PlanDeCalibracionUpdate.validar_fecha_mantenimiento(pasado)

    with pytest.raises(exceptions.NombreInvalido):
        schemas.PlanDeCalibracionUpdate.validar_nombre("Plan %%%")

    with pytest.raises(exceptions.NombreVacio):
        schemas.PlanDeCalibracionUpdate.validar_longitud("A")

    with pytest.raises(exceptions.PeriodicidadInvalida):
        schemas.PlanDeCalibracionUpdate.validar_periodicidad(-1)

    with pytest.raises(exceptions.DescripcionVacia):
        schemas.PlanDeCalibracionUpdate.validar_descripcion("")
