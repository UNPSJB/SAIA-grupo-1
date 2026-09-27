from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)


def test_post_plan_valido(session: Session) -> None:
    hoy = date.today().isoformat()
    response = client.post(
        "/plan_De_limpieza/",
        json={
            "nombre": "PlanLimpieza",
            "fecha_inicio": hoy,
            "equipo_id": 1,
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["nombre"] == "PlanLimpieza"
    assert data["fecha_inicio"] == hoy
    assert data["equipo_id"] == 1


def test_post_plan_alias_fechainicio(session: Session) -> None:
    pasado = (date.today() - timedelta(days=2)).isoformat()
    response = client.post(
        "/plan_De_limpieza/",
        json={
            "nombre": "PlanAlias",
            "fechaInicio": pasado,
            "equipo_id": 1,
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["fecha_inicio"] == pasado


def test_post_plan_fecha_inicio_futura_falla(session: Session) -> None:
    futuro = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        "/plan_De_limpieza/",
        json={
            "nombre": "PlanInvalido",
            "fecha_inicio": futuro,
            "equipo_id": 1,
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_put_plan_fecha_inicio(session: Session) -> None:
    # Creamos un plan
    hoy = date.today().isoformat()
    res_crear = client.post(
        "/plan_De_limpieza/",
        json={
            "nombre": "PlanOriginal",
            "fecha_inicio": hoy,
            "equipo_id": 1,
        },
    )
    plan_id = res_crear.json()["id"]

    # Editamos con fecha válida
    pasado = (date.today() - timedelta(days=3)).isoformat()
    res_edit = client.put(
        f"/plan_De_limpieza/{plan_id}",
        json={"fecha_inicio": pasado},
    )
    assert res_edit.status_code == status.HTTP_200_OK
    assert res_edit.json()["fecha_inicio"] == pasado

    # Intentamos editar con fecha futura
    futuro = (date.today() + timedelta(days=5)).isoformat()
    res_invalido = client.put(
        f"/plan_De_limpieza/{plan_id}",
        json={"fecha_inicio": futuro},
    )
    assert res_invalido.status_code == status.HTTP_400_BAD_REQUEST

