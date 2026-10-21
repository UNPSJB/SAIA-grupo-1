import pytest
from fastapi import status
from fastapi.testclient import TestClient
from tests.database import app, session  # noqa: F401
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401

client = TestClient(app)


def test_crud_categorias_incidentes(usuarios):
    admin = usuarios["administrador"]
    operador = usuarios["operador"]

    res_no_auth = client.post("/incidentes/categorias/", json={"nombre": "Prueba"})
    assert res_no_auth.status_code == status.HTTP_401_UNAUTHORIZED

    res_op = client.post(
        "/incidentes/categorias/",
        json={"nombre": "Prueba"},
        headers=headers(operador),
    )
    assert res_op.status_code == status.HTTP_403_FORBIDDEN

    res_crear = client.post(
        "/incidentes/categorias/",
        json={"nombre": "Seguridad e Higiene", "descripcion": "Incidentes de seguridad"},
        headers=headers(admin),
    )
    assert res_crear.status_code == status.HTTP_201_CREATED
    data_crear = res_crear.json()
    cat_id = data_crear["id"]
    assert data_crear["nombre"] == "Seguridad e Higiene"

    res_dup = client.post(
        "/incidentes/categorias/",
        json={"nombre": "seguridad e higiene"},
        headers=headers(admin),
    )
    assert res_dup.status_code == status.HTTP_400_BAD_REQUEST

    res_listar = client.get("/incidentes/categorias/", headers=headers(operador))
    assert res_listar.status_code == status.HTTP_200_OK
    categorias = res_listar.json()
    assert any(c["id"] == cat_id for c in categorias)

    res_edit = client.put(
        f"/incidentes/categorias/{cat_id}",
        json={"nombre": "Seguridad y Salud Ocupacional", "descripcion": "Nueva desc"},
        headers=headers(admin),
    )
    assert res_edit.status_code == status.HTTP_200_OK
    assert res_edit.json()["nombre"] == "Seguridad y Salud Ocupacional"

    res_del = client.delete(f"/incidentes/categorias/{cat_id}", headers=headers(admin))
    assert res_del.status_code == status.HTTP_204_NO_CONTENT

    res_del_404 = client.delete(f"/incidentes/categorias/{cat_id}", headers=headers(admin))
    assert res_del_404.status_code == status.HTTP_404_NOT_FOUND


def test_crear_incidente_asociado_a_categoria(usuarios):
    admin = usuarios["administrador"]
    operador = usuarios["operador"]

    res_cat = client.post(
        "/incidentes/categorias/",
        json={"nombre": "Planta y Almacenamiento", "descripcion": "Área de almacenamiento"},
        headers=headers(admin),
    )
    assert res_cat.status_code == status.HTTP_201_CREATED
    cat_id = res_cat.json()["id"]

    res_inc = client.post(
        "/incidentes/",
        data={"descripcion": "Derrame de agua en pasillo central", "categoria_id": cat_id},
        headers=headers(operador),
    )
    assert res_inc.status_code == status.HTTP_201_CREATED
    inc_data = res_inc.json()
    assert inc_data["categoria_id"] == cat_id
    assert inc_data["categoria_nombre"] == "Planta y Almacenamiento"

