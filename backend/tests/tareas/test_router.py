from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_crear_y_listar_tareas(session: Session):
    payload = {
        "nombre": "Limpieza de Quemadores",
        "descripcion": "Desengrasar quemadores de cocina",
        "frecuencia": "diaria",
        "plan_id": 1,
        "personal_id": 1,
    }
    res_crear = client.post("/tareas/", json=payload)
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["nombre"] == "Limpieza de Quemadores"
    assert data["personal_id"] == 1
    tarea_id = data["id"]

    res_listar = client.get("/tareas/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(t["id"] == tarea_id for t in res_listar.json())

def test_router_obtener_tarea_detalle(session: Session):
    payload = {
        "nombre": "Desinfeccion Picaportes",
        "descripcion": "Rociar con alcohol al 70",
        "frecuencia": "diaria",
        "plan_id": 1,
        "personal_id": 1,
    }
    res_crear = client.post("/tareas/", json=payload)
    tarea_id = res_crear.json()["id"]

    res_get = client.get(f"/tareas/{tarea_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == tarea_id

    res_404 = client.get("/tareas/99999")
    assert res_404.status_code == status.HTTP_400_BAD_REQUEST

def test_router_editar_y_eliminar_tarea(session: Session):
    payload = {
        "nombre": "Limpieza Filtros Campana",
        "descripcion": "Remojar filtros en agua caliente",
        "frecuencia": "semanal",
        "plan_id": 1,
        "personal_id": 1,
    }
    res_crear = client.post("/tareas/", json=payload)
    tarea_id = res_crear.json()["id"]

    res_edit = client.put(
        f"/tareas/{tarea_id}",
        json={
            "nombre": "Limpieza Filtros Modificada",
            "descripcion": "Remojar filtros en agua caliente",
            "frecuencia": "semanal",

            "plan_id": 1,
            "personal_id": 1,
        },
    )
    assert res_edit.status_code == status.HTTP_200_OK
    assert res_edit.json()["nombre"] == "Limpieza Filtros Modificada"

    res_del = client.delete(f"/tareas/{tarea_id}")
    assert res_del.status_code == status.HTTP_204_NO_CONTENT

    res_check = client.get(f"/tareas/{tarea_id}")
    assert res_check.status_code == status.HTTP_400_BAD_REQUEST