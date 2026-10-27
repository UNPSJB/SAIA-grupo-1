from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_crear_y_listar_tipo_certificado(session: Session):
    res_crear = client.post("/certificados/tipos/", data={"nombre": "Capacitacion Celiaquia"})
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["nombre"] == "Capacitacion Celiaquia"
    tipo_id = data["id"]

    res_listar = client.get("/certificados/tipos/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(t["id"] == tipo_id for t in res_listar.json())

def test_router_obtener_tipo_certificado(session: Session):
    res_crear = client.post("/certificados/tipos/", data={"nombre": "Control Sanitario"})
    tipo_id = res_crear.json()["id"]

    res_get = client.get(f"/certificados/tipos/{tipo_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == tipo_id

    res_404 = client.get("/certificados/tipos/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_router_eliminar_tipo_certificado(session: Session):
    res_crear = client.post("/certificados/tipos/", data={"nombre": "Tipo Temporal"})
    tipo_id = res_crear.json()["id"]

    res_del = client.delete(f"/certificados/tipos/{tipo_id}")
    assert res_del.status_code == status.HTTP_200_OK

    res_check = client.get(f"/certificados/tipos/{tipo_id}")
    assert res_check.status_code == status.HTTP_404_NOT_FOUND
