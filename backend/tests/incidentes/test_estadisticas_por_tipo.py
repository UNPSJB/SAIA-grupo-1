from datetime import date, datetime, timedelta
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from src.incidentes.constants import TipoIncidente
from tests.database import app, session  # noqa: F401
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401

client = TestClient(app)


def _crear_incidente(usuario: Personal, descripcion: str = "Test", tipo: str = "otro"):
    return client.post(
        "/incidentes/",
        data={"descripcion": descripcion, "tipo": tipo},
        headers=headers(usuario),
    )


def test_estadisticas_por_tipo_requiere_admin(usuarios):
    admin = usuarios["administrador"]
    operador = usuarios["operador"]

    res_sin_auth = client.get("/incidentes/estadisticas/por-tipo")
    assert res_sin_auth.status_code == status.HTTP_401_UNAUTHORIZED

    res_op = client.get("/incidentes/estadisticas/por-tipo", headers=headers(operador))
    assert res_op.status_code == status.HTTP_403_FORBIDDEN

    res_admin = client.get("/incidentes/estadisticas/por-tipo", headers=headers(admin))
    assert res_admin.status_code == status.HTTP_200_OK


def test_estadisticas_agrupacion_y_porcentajes(usuarios):
    admin = usuarios["administrador"]
    operador = usuarios["operador"]

    _crear_incidente(operador, "Falla motor", "equipamiento")
    _crear_incidente(operador, "Falla cinta", "equipamiento")
    _crear_incidente(operador, "Falta limpieza", "limpieza")

    res = client.get("/incidentes/estadisticas/por-tipo", headers=headers(admin))
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    assert data["total"] >= 3
    por_tipo = {item["tipo"]: item for item in data["por_tipo"]}

    assert por_tipo["equipamiento"]["cantidad"] >= 2
    assert por_tipo["limpieza"]["cantidad"] >= 1
    assert sum(item["porcentaje"] for item in data["por_tipo"]) == pytest.approx(100.0, abs=0.5)


def test_filtro_periodo_estadisticas(usuarios):
    admin = usuarios["administrador"]
    hoy = date.today()
    ayer = hoy - timedelta(days=1)
    hace_un_mes = hoy - timedelta(days=30)

    res_invalido = client.get(
        f"/incidentes/estadisticas/por-tipo?desde={hoy.isoformat()}&hasta={ayer.isoformat()}",
        headers=headers(admin),
    )
    assert res_invalido.status_code == status.HTTP_400_BAD_REQUEST

    res_valido = client.get(
        f"/incidentes/estadisticas/por-tipo?desde={hace_un_mes.isoformat()}&hasta={hoy.isoformat()}",
        headers=headers(admin),
    )
    assert res_valido.status_code == status.HTTP_200_OK
    data = res_valido.json()
    assert data["periodo_desde"] == hace_un_mes.isoformat()
    assert data["periodo_hasta"] == hoy.isoformat()


def test_detalle_incidentes_por_categoria(usuarios):
    admin = usuarios["administrador"]
    operador = usuarios["operador"]

    _crear_incidente(operador, "Falla en envasadora", "equipamiento")

    res = client.get(
        f"/incidentes/estadisticas/por-tipo/{TipoIncidente.EQUIPAMIENTO.value}",
        headers=headers(admin),
    )
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    assert isinstance(items, list)
    assert all(i["tipo"] == "equipamiento" for i in items)
