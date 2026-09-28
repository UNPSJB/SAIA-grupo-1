from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)


def test_get_dashboard_resumen(session: Session) -> None:
    response = client.get("/dashboard/resumen?periodo=semana")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "cumplimiento_actual" in data
    assert "consumo_insumos" in data
    assert "unidades_disponibles" in data
    assert "hechas" in data["cumplimiento_actual"]
    assert "pendientes" in data["cumplimiento_actual"]
    assert "vencidas" in data["cumplimiento_actual"]
    assert "porcentaje" in data["cumplimiento_actual"]


def test_get_dashboard_cumplimiento(session: Session) -> None:
    response = client.get("/dashboard/cumplimiento?periodo=dia")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "hechas" in data
    assert "pendientes" in data
    assert "vencidas" in data
    assert "porcentaje" in data


def test_get_dashboard_consumo_insumos(session: Session) -> None:
    response = client.get("/dashboard/consumo-insumos?periodo=semana&unidad=L")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "consumo" in data
    assert "unidades_disponibles" in data
    assert "unidad_actual" in data
    assert data["unidad_actual"] == "L"
