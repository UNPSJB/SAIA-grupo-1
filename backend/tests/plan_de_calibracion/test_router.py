from datetime import datetime, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_crear_y_listar_plan_calibracion(session: Session):
    mantenimiento = (datetime.now() + timedelta(days=2)).isoformat()
    payload = {
        "nombre": "Calibracion Balanza Uno",
        "periodicidad_De_cambio": 90,
        "fecha_mantenimiento": mantenimiento,
        "descripcion": "Verificacion con pesas patron",
        "equipo_id": 1,
    }
    res_crear = client.post("/plan_de_calibracion/", json=payload)
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["nombre"] == "Calibracion Balanza Uno"
    plan_id = data["id"]

    res_listar = client.get("/plan_de_calibracion/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(p["id"] == plan_id for p in res_listar.json())

def test_router_obtener_plan_calibracion(session: Session):
    mantenimiento = (datetime.now() + timedelta(days=3)).isoformat()
    payload = {
        "nombre": "Calibracion Termometro",
        "periodicidad_De_cambio": 30,
        "fecha_mantenimiento": mantenimiento,
        "descripcion": "Control sonda",
        "equipo_id": 2,
    }
    res_crear = client.post("/plan_de_calibracion/", json=payload)
    plan_id = res_crear.json()["id"]

    res_get = client.get(f"/plan_de_calibracion/{plan_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == plan_id

    res_404 = client.get("/plan_de_calibracion/99999")
    assert res_404.status_code == status.HTTP_400_BAD_REQUEST

def test_router_editar_plan_calibracion(session: Session):
    mantenimiento = (datetime.now() + timedelta(days=4)).isoformat()
    payload = {
        "nombre": "Calibracion Original",
        "periodicidad_De_cambio": 60,
        "fecha_mantenimiento": mantenimiento,
        "descripcion": "Revision general",
        "equipo_id": 1,
    }
    res_crear = client.post("/plan_de_calibracion/", json=payload)
    plan_id = res_crear.json()["id"]

    res_edit = client.put(f"/plan_de_calibracion/{plan_id}", json={"nombre": "Calibracion Modificada"})
    assert res_edit.status_code == status.HTTP_200_OK
    assert res_edit.json()["nombre"] == "Calibracion Modificada"

def test_router_efectuar_vencimiento_calibracion(session: Session):
    mantenimiento = (datetime.now() + timedelta(days=1)).isoformat()
    payload = {
        "nombre": "Calibracion Vence",
        "periodicidad_De_cambio": 15,
        "fecha_mantenimiento": mantenimiento,
        "descripcion": "Chequeo",
        "equipo_id": 1,
    }
    res_crear = client.post("/plan_de_calibracion/", json=payload)
    plan_id = res_crear.json()["id"]

    res_venc = client.post(f"/plan_de_calibracion/{plan_id}/vencimiento")
    assert res_venc.status_code == status.HTTP_200_OK
    assert res_venc.json()["fecha_vencimiento"] is not None
