from datetime import date, timedelta
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.checklist.schemas import ChecklistGenerar, CompletarTareaSchema
from src.checklist.services import completar_tarea, generar_checklist
from src.dashboard import services
from src.dashboard.exceptions import RangoFechasInvalido
from src.personal.schemas import Capacidades
from tests.database import app, session

client = TestClient(app)


def test_grafico_cumplimiento_sin_checklists(session: Session) -> None:
    hoy = date.today()
    desde = hoy - timedelta(days=10)
    resultado = services.obtener_grafico_cumplimiento(
        session, desde=desde, hasta=hoy, agrupacion="dia"
    )
    assert resultado.total_checklists == 0
    assert resultado.total_tareas == 0
    assert resultado.tareas_completadas == 0
    assert resultado.promedio_cumplimiento == 0.0
    assert resultado.puntos == []
    assert resultado.agrupacion == "dia"


def test_grafico_cumplimiento_por_dia(session: Session) -> None:
    hoy = date.today()
    ayer = hoy - timedelta(days=1)

    c_ayer = generar_checklist(session, ChecklistGenerar(responsable_legajo=1, fecha=hoy))
    for item in c_ayer.items:
        completar_tarea(
            session,
            c_ayer.id,
            item.id,
            CompletarTareaSchema(responsable_legajo=1, insumos_utilizados=[]),
        )
    c_ayer.fecha = ayer
    session.commit()

    c_hoy = generar_checklist(session, ChecklistGenerar(responsable_legajo=1, fecha=hoy))

    if c_hoy.items:
        completar_tarea(
            session,
            c_hoy.id,
            c_hoy.items[0].id,
            CompletarTareaSchema(responsable_legajo=1, insumos_utilizados=[]),
        )

    resultado = services.obtener_grafico_cumplimiento(
        session, desde=ayer, hasta=hoy, agrupacion="dia"
    )

    assert resultado.total_checklists == 2
    assert len(resultado.puntos) == 2

    punto_ayer = next(p for p in resultado.puntos if p.fecha == ayer)
    assert punto_ayer.porcentaje == 100.0
    assert punto_ayer.tareas_completadas == len(c_ayer.items)
    assert punto_ayer.tareas_pendientes == 0

    punto_hoy = next(p for p in resultado.puntos if p.fecha == hoy)
    esperado_hoy = round((1 / len(c_hoy.items)) * 100.0, 1)
    assert punto_hoy.porcentaje == esperado_hoy
    assert punto_hoy.tareas_completadas == 1
    assert punto_hoy.tareas_pendientes == len(c_hoy.items) - 1


def test_grafico_cumplimiento_por_semana(session: Session) -> None:
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    lunes = inicio_semana
    martes = inicio_semana + timedelta(days=1)

    c_lunes = generar_checklist(session, ChecklistGenerar(responsable_legajo=1, fecha=hoy))
    if c_lunes.items:
        completar_tarea(
            session,
            c_lunes.id,
            c_lunes.items[0].id,
            CompletarTareaSchema(responsable_legajo=1, insumos_utilizados=[]),
        )
    c_lunes.fecha = lunes
    session.commit()

    c_martes = generar_checklist(session, ChecklistGenerar(responsable_legajo=1, fecha=hoy))
    c_martes.fecha = martes
    session.commit()

    resultado = services.obtener_grafico_cumplimiento(
        session, desde=lunes, hasta=martes + timedelta(days=5), agrupacion="semana"
    )

    assert resultado.total_checklists >= 2
    assert len(resultado.puntos) >= 1

    punto_semana = next(p for p in resultado.puntos if p.fecha_inicio == lunes)
    assert punto_semana.total_checklists >= 2
    assert punto_semana.total_tareas == len(c_lunes.items) + len(c_martes.items)


def test_grafico_cumplimiento_rango_fechas_invalido(session: Session) -> None:
    hoy = date.today()
    ayer = hoy - timedelta(days=1)

    with pytest.raises(RangoFechasInvalido):
        services.obtener_grafico_cumplimiento(
            session, desde=hoy, hasta=ayer, agrupacion="dia"
        )


def test_router_grafico_cumplimiento(session: Session) -> None:
    hoy = date.today()
    desde = hoy - timedelta(days=7)

    res = client.get(f"/dashboard/grafico-cumplimiento?desde={desde}&hasta={hoy}&agrupacion=dia")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["agrupacion"] == "dia"
    assert "puntos" in data
    assert "promedio_cumplimiento" in data
    assert "total_checklists" in data

    res_invalido = client.get(f"/dashboard/grafico-cumplimiento?desde={hoy}&hasta={desde}")
    assert res_invalido.status_code == status.HTTP_400_BAD_REQUEST
    assert "no puede ser posterior" in res_invalido.json()["detail"]


def test_router_grafico_cumplimiento_restringido_a_operador() -> None:
    from types import SimpleNamespace
    from src.autenticacion.dependencies import get_usuario_actual

    usuario_operador = SimpleNamespace(legajo=99, capacidad=Capacidades.OPERAR, activo=True)
    app.dependency_overrides[get_usuario_actual] = lambda: usuario_operador

    try:
        res = client.get("/dashboard/grafico-cumplimiento")
        assert res.status_code == status.HTTP_403_FORBIDDEN
    finally:
        usuario_admin = SimpleNamespace(legajo=1, capacidad=Capacidades.AMBAS, activo=True)
        app.dependency_overrides[get_usuario_actual] = lambda: usuario_admin
