from typing import Dict
from fastapi import status
from fastapi.testclient import TestClient
from src.informes.constants import ErrorCode
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401
from tests.database import app, session  # noqa: F401

client = TestClient(app)
URL = "/informes/inspeccion"


def test_admin_descarga_el_informe_en_pdf(usuarios: Dict[str, Personal]):
    r = client.get(URL, params={"desde": "2026-10-01", "hasta": "2026-10-31"}, headers=headers(usuarios["administrador"]))

    assert r.status_code == status.HTTP_200_OK
    assert r.headers["content-type"] == "application/pdf"
    assert 'filename="informe-inspeccion_2026-10-01_2026-10-31.pdf"' in r.headers["content-disposition"]
    assert r.content.startswith(b"%PDF")


def test_usuario_con_ambas_capacidades_puede_generarlo(usuarios: Dict[str, Personal]):
    r = client.get(URL, params={"desde": "2026-10-01", "hasta": "2026-10-31"}, headers=headers(usuarios["ambos"]))

    assert r.status_code == status.HTTP_200_OK


def test_operador_no_puede_generar_el_informe(usuarios: Dict[str, Personal]):
    r = client.get(URL, params={"desde": "2026-10-01", "hasta": "2026-10-31"}, headers=headers(usuarios["operador"]))

    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_sin_sesion_no_puede_generar_el_informe(usuarios: Dict[str, Personal]):
    r = client.get(URL, params={"desde": "2026-10-01", "hasta": "2026-10-31"})

    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_sin_rango_de_fechas_falla(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])

    assert client.get(URL, headers=admin).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert client.get(URL, params={"desde": "2026-10-01"}, headers=admin).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert client.get(URL, params={"hasta": "2026-10-31"}, headers=admin).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_desde_posterior_a_hasta_falla(usuarios: Dict[str, Personal]):
    r = client.get(URL, params={"desde": "2026-10-31", "hasta": "2026-10-01"}, headers=headers(usuarios["administrador"]))

    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert r.json()["detail"] == ErrorCode.RANGO_FECHAS_INVALIDO
