from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)

def test_router_listar_insumos_quimicos(session: Session):
    res = client.get("/api/insumos-quimicos")
    assert res.status_code == status.HTTP_200_OK
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 4

def test_router_crear_insumo_quimico(session: Session):
    payload = {
        "nombre": "Acido Desincrustante",
        "tipo": "DESINFECTANTE",
        "unidad_medida": "L",
        "stock_actual": 20.0,
    }
    res = client.post("/api/insumos-quimicos", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["nombre"] == "Acido Desincrustante"
    assert data["stock_actual"] == 20.0
    assert data["activo"] is True

def test_router_crear_duplicado_retorna_400(session: Session):
    payload = {
        "nombre": "Alcohol Isopropilico",
        "tipo": "DESINFECTANTE",
        "unidad_medida": "L",
        "stock_actual": 10.0,
    }
    res1 = client.post("/api/insumos-quimicos", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    res2 = client.post("/api/insumos-quimicos", json=payload)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST

def test_router_actualizar_insumo_quimico(session: Session):
    payload = {
        "nombre": "Detergente Neutro",
        "tipo": "DESENGRASANTE",
        "unidad_medida": "L",
        "stock_actual": 50.0,
    }
    res_crear = client.post("/api/insumos-quimicos", json=payload)
    insumo_id = res_crear.json()["id"]

    res_put = client.put(f"/api/insumos-quimicos/{insumo_id}", json={"stock_actual": 75.0})
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["stock_actual"] == 75.0

def test_router_toggle_estado_insumo_quimico(session: Session):
    payload = {
        "nombre": "Desinfectante Clorado",
        "tipo": "DESINFECTANTE",
        "unidad_medida": "L",
        "stock_actual": 12.0,
    }
    res_crear = client.post("/api/insumos-quimicos", json=payload)
    insumo_id = res_crear.json()["id"]

    res_toggle = client.patch(f"/api/insumos-quimicos/{insumo_id}/toggle")
    assert res_toggle.status_code == status.HTTP_200_OK
    assert res_toggle.json()["activo"] is False

    res_toggle_404 = client.patch("/api/insumos-quimicos/99999/toggle")
    assert res_toggle_404.status_code == status.HTTP_404_NOT_FOUND
