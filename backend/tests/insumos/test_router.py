from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import status
from tests.database import app, session


client = TestClient(app)


def test_read_insumos(session: Session) -> None:
    response = client.get("/insumos/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 3


def test_read_insumo(session: Session) -> None:
    response = client.get("/insumos/1")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["nombre"] == "Harina de Trigo 000"

    response_404 = client.get("/insumos/999")
    assert response_404.status_code == status.HTTP_404_NOT_FOUND


def test_create_insumo(session: Session) -> None:
    hoy = datetime.now()
    response = client.post(
        "/insumos/",
        json={
            "nombre": "Sal Fina",
            "lote": "ING-SAL-010",
            "fechaRecepcion": (hoy - timedelta(days=1)).isoformat(),
            "fechaVencimiento": (hoy + timedelta(days=365)).isoformat(),
            "cantRecibida": 100.0,
            "stock": 100.0,
            "medida": "kilogramos",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["nombre"] == "Sal Fina"


def test_create_insumo_invalido(session: Session) -> None:
    hoy = datetime.now()
    # stock > cantRecibida
    response = client.post(
        "/insumos/",
        json={
            "nombre": "Insumo Invalido",
            "lote": "L-999",
            "fechaRecepcion": hoy.isoformat(),
            "cantRecibida": 10.0,
            "stock": 50.0,
            "medida": "unidades",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_update_insumo(session: Session) -> None:
    response = client.patch(
        "/insumos/1",
        json={"nombre": "Harina de Trigo 0000"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["nombre"] == "Harina de Trigo 0000"


def test_update_insumo_stock(session: Session) -> None:
    # Restar 10 unidades del insumo 1 (tenía 80 -> 70)
    response = client.patch(
        "/insumos/1/stock",
        json={"stock": 10.0},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["stock"] == 70.0

    # Intentar restar más del stock disponible
    response_invalido = client.patch(
        "/insumos/1/stock",
        json={"stock": 500.0},
    )
    assert response_invalido.status_code == status.HTTP_400_BAD_REQUEST


def test_delete_insumo(session: Session) -> None:
    response = client.delete("/insumos/1")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == 1

    # Verificar que ya no existe
    response_get = client.get("/insumos/1")
    assert response_get.status_code == status.HTTP_404_NOT_FOUND

