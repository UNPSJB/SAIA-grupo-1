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


def test_editar_plan_fecha_inicio(session: Session) -> None:
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
        PlanDeLimpiezaUpdate(fecha_inicio=fecha_anterior),
    )
    assert plan_editado.fecha_inicio == fecha_anterior

    # No debe permitir actualizar a una fecha futura
    fecha_futura = hoy + timedelta(days=3)
    with pytest.raises(exceptions.FechaInicioInvalida):
        editar_plan(
            session,
            plan.id,
            PlanDeLimpiezaUpdate(fecha_inicio=fecha_futura),
        )

