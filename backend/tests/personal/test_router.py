from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import status
from tests.database import app, session


client = TestClient(app)


def test_read_personas(session: Session) -> None:
    response = client.get(f"/personal")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 2


def test_crear_persona_no_expone_contrasenia(session: Session) -> None:
    response = client.post("/personal/", json={
        "documento": 30555666, "nombre": "Pepe", "apellido": "Gomez",
        "email": "pepe@gmail.com", "contrasenia": "Clave1234",
    })
    assert response.status_code == status.HTTP_201_CREATED
    cuerpo = response.json()
    assert cuerpo["usuario"] == "pepe.gomez"
    assert "contrasenia" not in cuerpo
    assert "contrasenia_hash" not in cuerpo


def test_crear_persona_sin_contrasenia(session: Session) -> None:
    response = client.post("/personal/", json={
        "documento": 30555666, "nombre": "Pepe", "apellido": "Gomez",
        "email": "pepe@gmail.com",
    })
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

