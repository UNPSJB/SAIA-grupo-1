from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)


def test_router_crear_proveedor(session: Session):
    res = client.post(
        "/proveedores/",
        json={
            "nombre": "Distribuidora Central",
            "cuit": "30-99887766-5",
            "contacto": "Pedro Lopez",
            "telefono": "011-5555-4444",
            "email": "pedro@central.com",
            "direccion": "Calle Falsa 123",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["nombre"] == "Distribuidora Central"
    assert data["cuit"] == "30-99887766-5"
    assert data["activo"] is True
    assert "id" in data


def test_router_crear_proveedor_duplicado_falla(session: Session):
    client.post("/proveedores/", json={"nombre": "Molino San Martin"})
    res = client.post("/proveedores/", json={"nombre": "  molino   san martin  "})
    assert res.status_code == status.HTTP_400_BAD_REQUEST


def test_router_listar_proveedores(session: Session):
    client.post("/proveedores/", json={"nombre": "Proveedor Alpha"})
    res = client.get("/proveedores/")
    assert res.status_code == status.HTTP_200_OK
    assert any(p["nombre"] == "Proveedor Alpha" for p in res.json())


def test_router_obtener_proveedor(session: Session):
    res_crear = client.post("/proveedores/", json={"nombre": "Proveedor Beta"})
    p_id = res_crear.json()["id"]

    res = client.get(f"/proveedores/{p_id}")
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["id"] == p_id

    res_404 = client.get("/proveedores/999999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND


def test_router_actualizar_proveedor(session: Session):
    res_crear = client.post("/proveedores/", json={"nombre": "Proveedor Gamma"})
    p_id = res_crear.json()["id"]

    res_up = client.put(f"/proveedores/{p_id}", json={"nombre": "Proveedor Gamma Modificado"})
    assert res_up.status_code == status.HTTP_200_OK
    assert res_up.json()["nombre"] == "Proveedor Gamma Modificado"


def test_router_eliminar_proveedor(session: Session):
    res_crear = client.post("/proveedores/", json={"nombre": "Proveedor Delta"})
    p_id = res_crear.json()["id"]

    res_del = client.delete(f"/proveedores/{p_id}")
    assert res_del.status_code == status.HTTP_200_OK

    res_activos = client.get("/proveedores/?solo_activos=true")
    assert all(p["id"] != p_id for p in res_activos.json())
