import pytest
from datetime import date, timedelta
from sqlalchemy.orm import Session
from tests.database import session
from src.plan_De_limpieza import exceptions
from src.plan_De_limpieza.services import (
    crear_plan,
    listar_planes,
    obtener_plan,
    editar_plan,
)
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate, PlanDeLimpiezaUpdate
from src.tareas.schemas import TareaBase
from src.tareas.models import Frecuencia

def test_crear_plan_valido(session: Session) -> None:
    hoy = date.today()
    plan = crear_plan(
        session,
        PlanDeLimpiezaCreate(
            nombre="PlanDiario",
            fecha_inicio=hoy,
            equipo_id=1,
        ),
    )
    assert plan.id is not None
    assert plan.nombre == "PlanDiario"
    assert plan.fecha_inicio == hoy
    assert plan.equipo_id == 1

def test_crear_plan_con_tareas(session: Session) -> None:
    hoy = date.today()
    tarea = TareaBase(
        nombre="Limpiar rejilla",
        descripcion="Limpieza diaria con agua y jabon",
        frecuencia=Frecuencia.DIARIA,
        personal_id=1,
    )
    plan = crear_plan(
        session,
        PlanDeLimpiezaCreate(
            nombre="Plan Con Tareas",
            fecha_inicio=hoy,
            equipo_id=1,
            tareas=[tarea],
        ),
    )
    assert plan.id is not None
    assert len(plan.tareas) == 1
    assert plan.tareas[0].nombre == "Limpiar rejilla"

def test_crear_plan_fecha_inicio_pasada(session: Session) -> None:
    pasado = date.today() - timedelta(days=5)
    plan = crear_plan(
        session,
        PlanDeLimpiezaCreate(
            nombre="PlanSemanal",
            fecha_inicio=pasado,
            equipo_id=1,
        ),
    )
    assert plan.fecha_inicio == pasado

def test_crear_plan_fecha_inicio_futura_falla(session: Session) -> None:
    manana = date.today() + timedelta(days=1)
    with pytest.raises(exceptions.FechaInicioInvalida):
        crear_plan(
            session,
            PlanDeLimpiezaCreate(
                nombre="PlanFuturo",
                fecha_inicio=manana,
                equipo_id=1,
            ),
        )

def test_obtener_plan_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.PlanNoEncontrado):
        obtener_plan(session, 9999)

def test_editar_plan_fecha_inicio_y_objetivo(session: Session) -> None:
    hoy = date.today()
    plan = crear_plan(
        session,
        PlanDeLimpiezaCreate(
            nombre="PlanBase",
            fecha_inicio=hoy,
            equipo_id=1,
        ),
    )

    fecha_anterior = hoy - timedelta(days=2)
    plan_editado = editar_plan(
        session,
        plan.id,
        PlanDeLimpiezaUpdate(fecha_inicio=fecha_anterior, sector_id=1, equipo_id=None),
    )
    assert plan_editado.fecha_inicio == fecha_anterior

    with pytest.raises(exceptions.FechaInicioInvalida):
        editar_plan(
            session,
            plan.id,
            PlanDeLimpiezaUpdate(fecha_inicio=hoy + timedelta(days=3)),
        )

def test_crear_plan_sector_valido(session: Session) -> None:
    hoy = date.today()
    plan = crear_plan(
        session,
        PlanDeLimpiezaCreate(
            nombre="PlanSectorCocina",
            fecha_inicio=hoy,
            sector_id=1,
        ),
    )
    assert plan.id is not None
    assert plan.sector_id == 1
    assert plan.nombre_sector == "Cocina"
    assert plan.equipo_id is None

def test_validaciones_schemas_plan_limpieza() -> None:
    with pytest.raises(exceptions.NombreCaracteresRaros):
        PlanDeLimpiezaCreate.validar_nombre("Plan @#$%")

    with pytest.raises(exceptions.NombreError):
        PlanDeLimpiezaCreate.validar_longitud("X")

    with pytest.raises(exceptions.ObjetivoInvalido):
        PlanDeLimpiezaCreate(nombre="Plan Sin Objetivo", fecha_inicio=date.today())

    with pytest.raises(exceptions.ObjetivoInvalido):
        PlanDeLimpiezaCreate(nombre="Plan Doble Objetivo", fecha_inicio=date.today(), equipo_id=1, sector_id=1)

    with pytest.raises(exceptions.NombreCaracteresRaros):
        PlanDeLimpiezaUpdate.validar_nombre("Plan %%%")

    with pytest.raises(exceptions.NombreError):
        PlanDeLimpiezaUpdate.validar_longitud("A")
