from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_crear_y_listar_tipo_documento(session: Session):
    res_crear = client.post("/documentos/tipos/", data={"nombre": "Registro de Limpieza"})
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["nombre"] == "Registro de Limpieza"
    tipo_id = data["id"]

    res_listar = client.get("/documentos/tipos/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(t["id"] == tipo_id for t in res_listar.json())

def test_router_obtener_tipo_documento(session: Session):
    res_crear = client.post("/documentos/tipos/", data={"nombre": "Manual BPM Extendido"})
    tipo_id = res_crear.json()["id"]

    res_get = client.get(f"/documentos/tipos/{tipo_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == tipo_id

    res_404 = client.get("/documentos/tipos/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_router_actualizar_tipo_documento(session: Session):
    res_crear = client.post("/documentos/tipos/", data={"nombre": "Borrador Tipo"})
    tipo_id = res_crear.json()["id"]

    res_put = client.put(f"/documentos/tipos/{tipo_id}", data={"nombre": "Tipo Final"})
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["nombre"] == "Tipo Final"

def test_router_eliminar_tipo_documento(session: Session):
    res_crear = client.post("/documentos/tipos/", data={"nombre": "Tipo Descartable"})
    tipo_id = res_crear.json()["id"]

    res_del = client.delete(f"/documentos/tipos/{tipo_id}")
    assert res_del.status_code == status.HTTP_200_OK

    res_check = client.get(f"/documentos/tipos/{tipo_id}")
    assert res_check.status_code == status.HTTP_404_NOT_FOUND

