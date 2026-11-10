from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)
URL = "/acercaDeNosotros"


def test_obtener_acerca_de_nosotros_vacio(session: Session):
    res = client.get(f"{URL}/")
    assert res.status_code == status.HTTP_200_OK
    assert res.json() is None


def test_crear_y_obtener_acerca_de_nosotros_endpoint(session: Session):
    res_crear = client.post(
        f"{URL}/",
        json={"descripcion": "Empresa dedicada a la elaboracion de panificados"},
    )
    assert res_crear.status_code == status.HTTP_200_OK
    data = res_crear.json()
    assert data["id"] is not None
    assert data["descripcion"] == "Empresa dedicada a la elaboracion de panificados"
    id_registro = data["id"]

    res_get = client.get(f"{URL}/")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == id_registro


def test_actualizar_acerca_de_nosotros_endpoint(session: Session):
    res_crear = client.post(
        f"{URL}/",
        json={"descripcion": "Texto viejo"},
    )
    id_registro = res_crear.json()["id"]

    res_put = client.put(
        f"{URL}/{id_registro}",
        json={"descripcion": "Texto nuevo y mejorado"},
    )
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["descripcion"] == "Texto nuevo y mejorado"


def test_crear_acerca_de_nosotros_caracteres_invalidos(session: Session):
    res = client.post(
        f"{URL}/",
        json={"descripcion": "Invalido con simbolos @@@ $$$ %%%"},
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST

