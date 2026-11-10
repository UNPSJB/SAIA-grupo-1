import io
from datetime import date
from typing import Dict
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios
from tests.database import app, session

client = TestClient(app)
URL = "/controles-ambientales"


def test_controles_ambientales_sin_token_requiere_autenticacion(autenticacion_real: None):
    assert client.get(URL).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get(f"{URL}/exportar-csv").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.post(URL, data={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30}).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get(f"{URL}/1").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.put(f"{URL}/1", json={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30}).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.delete(f"{URL}/1").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.patch(f"{URL}/1/reactivar").status_code == status.HTTP_401_UNAUTHORIZED


def test_operador_no_puede_modificar_controles(usuarios: Dict[str, Personal]):
    operador = headers(usuarios["operador"])
    assert client.post(URL, data={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30}, headers=operador).status_code == status.HTTP_403_FORBIDDEN
    assert client.put(f"{URL}/1", json={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30}, headers=operador).status_code == status.HTTP_403_FORBIDDEN
    assert client.delete(f"{URL}/1", headers=operador).status_code == status.HTTP_403_FORBIDDEN
    assert client.patch(f"{URL}/1/reactivar", headers=operador).status_code == status.HTTP_403_FORBIDDEN
    assert client.post(f"{URL}/1/visitas", data={"fecha_realizacion": "2026-11-01"}, headers=operador).status_code == status.HTTP_403_FORBIDDEN


def test_crear_y_obtener_control_admin(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    resp = client.post(
        URL,
        data={
            "tipo": "CONTROL_PLAGAS",
            "periodicidad_dias": 30,
            "observaciones": "Control mensual",
        },
        headers=admin,
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["id"] is not None
    assert data["tipo"] == "CONTROL_PLAGAS"
    assert data["periodicidad_dias"] == 30
    control_id = data["id"]

    get_resp = client.get(f"{URL}/{control_id}", headers=admin)
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json()["id"] == control_id
    assert "visitas" in get_resp.json()


def test_crear_control_duplicado_y_periodicidad_invalida(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    resp1 = client.post(
        URL,
        data={"tipo": "ANALISIS_AGUA", "periodicidad_dias": 60},
        headers=admin,
    )
    assert resp1.status_code == status.HTTP_201_CREATED

    resp_dup = client.post(
        URL,
        data={"tipo": "ANALISIS_AGUA", "periodicidad_dias": 90},
        headers=admin,
    )
    assert resp_dup.status_code == status.HTTP_400_BAD_REQUEST

    resp_invalida = client.post(
        URL,
        data={"tipo": "LIMPIEZA_TANQUE", "periodicidad_dias": -5},
        headers=admin,
    )
    assert resp_invalida.status_code == status.HTTP_400_BAD_REQUEST


def test_obtener_control_inexistente(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    assert client.get(f"{URL}/99999", headers=admin).status_code == status.HTTP_404_NOT_FOUND


def test_registrar_visita_exitoso_y_errores(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    crear_resp = client.post(
        URL,
        data={"tipo": "LIMPIEZA_TANQUE", "periodicidad_dias": 180},
        headers=admin,
    )
    control_id = crear_resp.json()["id"]

    assert client.post(f"{URL}/99999/visitas", data={"fecha_realizacion": "2026-11-01"}, headers=admin).status_code == status.HTTP_404_NOT_FOUND

    sin_archivo = client.post(
        f"{URL}/{control_id}/visitas",
        data={"fecha_realizacion": "2026-11-01"},
        headers=admin,
    )
    assert sin_archivo.status_code == status.HTTP_400_BAD_REQUEST

    archivo_fake = ("cert.pdf", io.BytesIO(b"%PDF-1.4 contenido"), "application/pdf")
    visita_resp = client.post(
        f"{URL}/{control_id}/visitas",
        data={"fecha_realizacion": "2026-11-01", "observaciones": "Visita semestral"},
        files={"archivo": archivo_fake},
        headers=admin,
    )
    assert visita_resp.status_code == status.HTTP_201_CREATED
    assert visita_resp.json()["control_id"] == control_id
    assert visita_resp.json()["certificado_url"] is not None


def test_actualizar_control_y_errores(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    crear_resp = client.post(
        URL,
        data={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30},
        headers=admin,
    )
    control_id = crear_resp.json()["id"]

    assert client.put(f"{URL}/99999", json={"periodicidad_dias": 45}, headers=admin).status_code == status.HTTP_404_NOT_FOUND

    invalido = client.put(f"{URL}/{control_id}", json={"periodicidad_dias": 0}, headers=admin)
    assert invalido.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    actualizado = client.put(
        f"{URL}/{control_id}",
        json={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 45, "observaciones": "Cambio periodicidad"},
        headers=admin,
    )
    assert actualizado.status_code == status.HTTP_200_OK
    assert actualizado.json()["periodicidad_dias"] == 45


def test_eliminar_y_reactivar_control(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    crear_resp = client.post(
        URL,
        data={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30},
        headers=admin,
    )
    control_id = crear_resp.json()["id"]

    assert client.delete(f"{URL}/99999", headers=admin).status_code == status.HTTP_404_NOT_FOUND
    assert client.patch(f"{URL}/99999/reactivar", headers=admin).status_code == status.HTTP_404_NOT_FOUND

    del_resp = client.delete(f"{URL}/{control_id}", headers=admin)
    assert del_resp.status_code == status.HTTP_204_NO_CONTENT

    get_resp = client.get(f"{URL}/{control_id}", headers=admin)
    assert get_resp.json()["activo"] is False

    react_resp = client.patch(f"{URL}/{control_id}/reactivar", headers=admin)
    assert react_resp.status_code == status.HTTP_200_OK
    assert react_resp.json()["activo"] is True


def test_exportar_csv_y_servir_certificado(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    client.post(
        URL,
        data={"tipo": "CONTROL_PLAGAS", "periodicidad_dias": 30},
        headers=admin,
    )
    csv_resp = client.get(f"{URL}/exportar-csv", headers=admin)
    assert csv_resp.status_code == status.HTTP_200_OK
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "ID,Tipo de Control" in csv_resp.text

    assert client.get(f"{URL}/certificados/no_existe.pdf", headers=admin).status_code == status.HTTP_400_BAD_REQUEST


def test_servir_certificado_existente(usuarios: Dict[str, Personal]):
    from src.controlesAmbientales import services
    admin = headers(usuarios["administrador"])
    ruta_dummy = services.STORAGE_DIR / "dummy_test_cert.pdf"
    ruta_dummy.write_bytes(b"%PDF-1.4 dummy")
    try:
        res = client.get(f"{URL}/certificados/dummy_test_cert.pdf", headers=admin)
        assert res.status_code == status.HTTP_200_OK
        assert "application/pdf" in res.headers["content-type"]
    finally:
        if ruta_dummy.exists():
            ruta_dummy.unlink()


def test_listar_controles_endpoint_admin(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    res = client.get(URL, headers=admin)
    assert res.status_code == status.HTTP_200_OK
    assert isinstance(res.json(), list)
