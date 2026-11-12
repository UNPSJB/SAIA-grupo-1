from types import SimpleNamespace
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual
from src.personal.schemas import Capacidades
from tests.database import USUARIO_DE_PRUEBA, app, session

client = TestClient(app)


def test_router_crud_unidades_medida(session: Session) -> None:
    res_crear = client.post(
        "/unidades-medida/",
        json={"nombre": "Bolsas", "abreviatura": "BOL"},
    )
    assert res_crear.status_code == status.HTTP_201_CREATED
    creada = res_crear.json()
    assert creada["nombre"] == "Bolsas"
    assert creada["abreviatura"] == "BOL"
    assert creada["activo"] is True
    u_id = creada["id"]

    res_dup = client.post(
        "/unidades-medida/",
        json={"nombre": "  bolsas ", "abreviatura": "BLS"},
    )
    assert res_dup.status_code == status.HTTP_400_BAD_REQUEST

    res_list = client.get("/unidades-medida/?busqueda=bol")
    assert res_list.status_code == status.HTTP_200_OK
    assert any(u["id"] == u_id for u in res_list.json())

    res_get = client.get(f"/unidades-medida/{u_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == u_id

    res_put = client.put(
        f"/unidades-medida/{u_id}",
        json={"nombre": "Bolsas Grandes", "abreviatura": "BG"},
    )
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["abreviatura"] == "BG"

    res_del = client.delete(f"/unidades-medida/{u_id}")
    assert res_del.status_code == status.HTTP_200_OK
    assert res_del.json()["activo"] is False

    res_activos = client.get("/unidades-medida/?solo_activos=true")
    assert all(u["id"] != u_id for u in res_activos.json())

    res_rest = client.post(f"/unidades-medida/{u_id}/restaurar")
    assert res_rest.status_code == status.HTTP_200_OK
    assert res_rest.json()["activo"] is True

    res_csv = client.get("/unidades-medida/exportar-csv")
    assert res_csv.status_code == status.HTTP_200_OK


def test_router_permisos_operador_unidades_medida(session: Session) -> None:
    operador = SimpleNamespace(legajo=2, capacidad=Capacidades.OPERAR, activo=True)
    app.dependency_overrides[get_usuario_actual] = lambda: operador
    try:
        res_get = client.get("/unidades-medida/")
        assert res_get.status_code == status.HTTP_200_OK

        res_post = client.post(
            "/unidades-medida/",
            json={"nombre": "Frascos", "abreviatura": "FR"},
        )
        assert res_post.status_code == status.HTTP_403_FORBIDDEN

        res_del = client.delete("/unidades-medida/1")
        assert res_del.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA
