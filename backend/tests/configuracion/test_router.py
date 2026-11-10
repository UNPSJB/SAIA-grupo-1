from types import SimpleNamespace

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.autenticacion.dependencies import get_usuario_actual
from src.indentificadorDeQR.schemas import IdentificadorQRCreate
from src.indentificadorDeQR.services import crear_IdentificadorUnico
from src.personal.schemas import Capacidades
from tests.database import USUARIO_DE_PRUEBA, app, session

client = TestClient(app)

OPERADOR = SimpleNamespace(legajo=2, capacidad=Capacidades.OPERAR, activo=True)


@pytest.fixture
def como_operador():
    app.dependency_overrides[get_usuario_actual] = lambda: OPERADOR
    yield
    app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA


@pytest.fixture
def sin_sesion():
    # sin override se usa la dependencia real, que exige un token
    app.dependency_overrides.pop(get_usuario_actual, None)
    yield
    app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA


def _qr(session: Session) -> str:
    return crear_IdentificadorUnico(session, IdentificadorQRCreate(), urldelQR="http://localhost/vista-publica").id_alfanumerico


# --- GET /configuracion/vista-publica ---

def test_vista_publica_sin_habilitar(session: Session) -> None:
    res = client.get("/configuracion/vista-publica")
    assert res.status_code == status.HTTP_200_OK
    assert res.json() == {
        "habilitada": False,
        "id_alfanumerico": None,
        "urldelQR": None,
        "ver_grafico": False,
        "verAcercaDeNosotros": False,
        "verProductos": False,
    }


def test_vista_publica_habilitada(session: Session) -> None:
    qr = _qr(session)
    res = client.get("/configuracion/vista-publica")
    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["habilitada"] is True
    assert body["id_alfanumerico"] == qr
    assert body["urldelQR"] == "http://localhost/vista-publica"


def test_vista_publica_ignora_qr_deshabilitado(session: Session) -> None:
    qr = _qr(session)
    client.put(f"/identificadorQR/{qr}")  # lo deshabilita
    assert client.get("/configuracion/vista-publica").json()["habilitada"] is False


# --- PUT /configuracion/vista-publica ---

def test_actualizar_parametros(session: Session) -> None:
    qr = _qr(session)
    res = client.put("/configuracion/vista-publica", json={"ver_grafico": True, "verProductos": True})
    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["ver_grafico"] is True
    assert body["verProductos"] is True
    assert body["verAcercaDeNosotros"] is False  # no se envió, no cambia

    # la vista pública ve los mismos valores
    publico = client.get(f"/identificadorQR/verificar/{qr}").json()
    assert publico["ver_grafico"] is True
    assert publico["verProductos"] is True


def test_deshabilitar_vista_publica(session: Session) -> None:
    qr = _qr(session)
    res = client.put("/configuracion/vista-publica", json={"habilitada": False})
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["habilitada"] is False
    assert client.get(f"/identificadorQR/verificar/{qr}").status_code == status.HTTP_400_BAD_REQUEST


def test_no_se_habilita_desde_configuracion(session: Session) -> None:
    _qr(session)
    res = client.put("/configuracion/vista-publica", json={"habilitada": True})
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_actualizar_sin_cambios(session: Session) -> None:
    _qr(session)
    assert client.put("/configuracion/vista-publica", json={}).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_actualizar_sin_vista_habilitada(session: Session) -> None:
    res = client.put("/configuracion/vista-publica", json={"ver_grafico": True})
    assert res.status_code == status.HTTP_404_NOT_FOUND


# --- permisos ---

@pytest.mark.parametrize("metodo, url, body", [
    ("get", "/configuracion/vista-publica", None),
    ("put", "/configuracion/vista-publica", {"ver_grafico": True}),
    ("post", "/quickCode/", {"texto": "http://localhost"}),
    ("post", "/identificadorQR/", {}),
    ("put", "/identificadorQR/QR_ID", None),
    ("put", "/identificadorQR/QR_ID/ver-grafico", {"ver_grafico": True}),
    ("put", "/identificadorQR/QR_ID/ver-acercaDeNosotros", {"verAcercaDeNosotros": True}),
    ("put", "/identificadorQR/QR_ID/ver-productos", {"verProductos": True}),
])
def test_operador_no_accede(session: Session, como_operador, metodo: str, url: str, body) -> None:
    qr = _qr(session)
    res = client.request(metodo, url.replace("QR_ID", qr), json=body)
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("metodo, url", [
    ("get", "/configuracion/vista-publica"),
    ("put", "/configuracion/vista-publica"),
    ("post", "/quickCode/"),
    ("put", "/identificadorQR/QR_ID/ver-grafico"),
])
def test_sin_sesion_no_accede(session: Session, sin_sesion, metodo: str, url: str) -> None:
    qr = _qr(session)
    res = client.request(metodo, url.replace("QR_ID", qr), json={})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_endpoints_publicos_siguen_abiertos(session: Session, sin_sesion) -> None:
    qr = _qr(session)
    assert client.get(f"/identificadorQR/verificar/{qr}").status_code == status.HTTP_200_OK
    assert client.get(f"/identificadorQR/{qr}/productos").status_code == status.HTTP_200_OK
    assert client.get("/acercaDeNosotros/").status_code == status.HTTP_200_OK
