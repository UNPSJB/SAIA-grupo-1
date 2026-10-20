from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_crear_y_listar_elemento(session: Session):
    payload = {"nombre": "Balde Plastico", "frecuenciaDeCambio": 45}
    res_crear = client.post("/elementosDeLimpieza/", json=payload)
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["nombre"] == "Balde Plastico"
    assert data["frecuenciaDeCambio"] == 45
    assert data["activo"] is True
    elem_id = data["id"]

    res_listar = client.get("/elementosDeLimpieza/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(e["id"] == elem_id for e in res_listar.json())

def test_router_obtener_elemento(session: Session):
    res_crear = client.post("/elementosDeLimpieza/", json={"nombre": "Rociador", "frecuenciaDeCambio": 30})
    elem_id = res_crear.json()["id"]

    res_get = client.get(f"/elementosDeLimpieza/{elem_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == elem_id

    res_404 = client.get("/elementosDeLimpieza/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_router_editar_elemento(session: Session):
    res_crear = client.post("/elementosDeLimpieza/", json={"nombre": "Panio Micro", "frecuenciaDeCambio": 15})
    elem_id = res_crear.json()["id"]

    res_edit = client.put(f"/elementosDeLimpieza/{elem_id}", json={"nombre": "Panio Especial", "frecuenciaDeCambio": 20})
    assert res_edit.status_code == status.HTTP_200_OK

    res_get = client.get(f"/elementosDeLimpieza/{elem_id}")
    assert res_get.json()["nombre"] == "Panio Especial"

def test_router_eliminar_elemento(session: Session):
    res_crear = client.post("/elementosDeLimpieza/", json={"nombre": "Rejilla Cocina", "frecuenciaDeCambio": 10})
    elem_id = res_crear.json()["id"]

    res_del = client.delete(f"/elementosDeLimpieza/{elem_id}")
    assert res_del.status_code == status.HTTP_200_OK
    assert res_del.json()["activo"] is False

def test_router_cambiar_elemento(session: Session):
    res_crear = client.post("/elementosDeLimpieza/", json={"nombre": "Esponja Acero", "frecuenciaDeCambio": 7})
    elem_id = res_crear.json()["id"]

    res_cambio = client.post(f"/elementosDeLimpieza/{elem_id}/cambiar")
    assert res_cambio.status_code == status.HTTP_200_OK
    assert res_cambio.json()["fechaCambio"] is not None
