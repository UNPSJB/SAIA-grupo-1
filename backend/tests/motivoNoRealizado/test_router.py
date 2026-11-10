from tests.database import app, session
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

client = TestClient(app)

def test_crear_motivo_exitoso(session: Session) -> None:
    res = client.post("/checklist/motivos/", json={"nombre": "Rotura de Cañería"})
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["nombre"] == "Rotura de Cañería"
    assert data["activo"] is True
    assert "id" in data

def test_crear_motivo_duplicado(session: Session) -> None:
    client.post("/checklist/motivos/", json={"nombre": "Falta de Personal"})
    res = client.post("/checklist/motivos/", json={"nombre": "falta de personal"})
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_listar_motivos(session: Session) -> None:
    client.post("/checklist/motivos/", json={"nombre": "Motivo A"})
    client.post("/checklist/motivos/", json={"nombre": "Motivo B"})
    res = client.get("/checklist/motivos/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) >= 2
    nombres = [m["nombre"] for m in data]
    assert "Motivo A" in nombres
    assert "Motivo B" in nombres

def test_listar_motivos_prefijo_alternativo(session: Session) -> None:
    res = client.get("/motivos/")
    assert res.status_code == status.HTTP_200_OK

def test_obtener_motivo_existente_e_inexistente(session: Session) -> None:
    res_crear = client.post("/checklist/motivos/", json={"nombre": "Motivo ID Check"})
    m_id = res_crear.json()["id"]

    res_ok = client.get(f"/checklist/motivos/{m_id}")
    assert res_ok.status_code == status.HTTP_200_OK
    assert res_ok.json()["nombre"] == "Motivo ID Check"

    res_404 = client.get("/checklist/motivos/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_cambiar_estado_motivo_patch(session: Session) -> None:
    res_crear = client.post("/checklist/motivos/", json={"nombre": "Para Desactivar"})
    m_id = res_crear.json()["id"]

    res_patch = client.patch(f"/checklist/motivos/{m_id}/estado", json={"activo": False})
    assert res_patch.status_code == status.HTTP_200_OK
    assert res_patch.json()["activo"] is False

    res_patch2 = client.patch(f"/checklist/motivos/{m_id}/estado", json={"activo": True})
    assert res_patch2.status_code == status.HTTP_200_OK
    assert res_patch2.json()["activo"] is True

def test_cambiar_estado_motivo_put(session: Session) -> None:
    res_crear = client.post("/checklist/motivos/", json={"nombre": "Para Put"})
    m_id = res_crear.json()["id"]

    res_put = client.put(f"/checklist/motivos/{m_id}", json={"activo": False})
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["activo"] is False

def test_desactivar_motivo_otro_bloqueado(session: Session) -> None:
    res_crear = client.post("/checklist/motivos/", json={"nombre": "Otro"})
    m_id = res_crear.json()["id"]

    res_patch = client.patch(f"/checklist/motivos/{m_id}/estado", json={"activo": False})
    assert res_patch.status_code == status.HTTP_400_BAD_REQUEST
