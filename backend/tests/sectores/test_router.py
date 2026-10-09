from tests.database import app, session
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.sectores.models import Sector

client = TestClient(app)

def test_crear_sector_valido(session: Session) -> None:
    res = client.post("/sectores/", json={"nombre": "Panaderia"})
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["nombre"] == "Panaderia"
    assert "id" in data

def test_crear_sector_duplicado_falla(session: Session) -> None:
    client.post("/sectores/", json={"nombre": "Rotiseria"})
    res = client.post("/sectores/", json={"nombre": "Rotiseria"})
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_crear_sector_nombre_invalido_falla(session: Session) -> None:
    res = client.post("/sectores/", json={"nombre": ""})
    assert res.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_CONTENT)

def test_listar_sectores(session: Session) -> None:
    res = client.get("/sectores/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) >= 2
    nombres = [s["nombre"] for s in data]
    assert "Cocina" in nombres
    assert "Deposito" in nombres

def test_obtener_sector_existente_e_inexistente(session: Session) -> None:
    res = client.get("/sectores/1")
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["id"] == 1

    res_inexistente = client.get("/sectores/99999")
    assert res_inexistente.status_code == status.HTTP_404_NOT_FOUND

def test_editar_sector_exitoso_y_duplicado(session: Session) -> None:
    res_crear = client.post("/sectores/", json={"nombre": "SectorOriginal"})
    sector_id = res_crear.json()["id"]

    res_edit = client.put(f"/sectores/{sector_id}", json={"nombre": "SectorModificado"})
    assert res_edit.status_code == status.HTTP_200_OK
    assert res_edit.json()["nombre"] == "SectorModificado"

    res_dup = client.put(f"/sectores/{sector_id}", json={"nombre": "Cocina"})
    assert res_dup.status_code == status.HTTP_400_BAD_REQUEST

def test_eliminar_sector_en_uso_falla(session: Session) -> None:
    res = client.delete("/sectores/1")
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_eliminar_sector_sin_uso_exitoso(session: Session) -> None:
    res_crear = client.post("/sectores/", json={"nombre": "SectorLibre"})
    sector_id = res_crear.json()["id"]

    res_del = client.delete(f"/sectores/{sector_id}")
    assert res_del.status_code == status.HTTP_200_OK

    res_get = client.get(f"/sectores/{sector_id}")
    assert res_get.status_code == status.HTTP_404_NOT_FOUND

