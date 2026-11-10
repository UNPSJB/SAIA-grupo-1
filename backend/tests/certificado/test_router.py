from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.tipoCertificado.services import crear_tipo_certificado

client = TestClient(app)

def test_router_crear_y_listar_certificados(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Manipulador Router")
    fecha_v = (date.today() + timedelta(days=90)).isoformat()
    data = {
        "id_tipo": str(tipo.id),
        "fechaVencimiento": fecha_v,
        "legajo_persona": "1",
    }
    res_crear = client.post("/certificados/", data=data)
    assert res_crear.status_code == status.HTTP_200_OK
    cert_id = res_crear.json()["id"]

    res_listar = client.get("/certificados/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(c["id"] == cert_id for c in res_listar.json())

    res_filtrar = client.get("/certificados/?legajo_persona=1")
    assert res_filtrar.status_code == status.HTTP_200_OK
    assert any(c["id"] == cert_id for c in res_filtrar.json())

def test_router_obtener_certificado_detalle(session: Session):
    tipo = crear_tipo_certificado(session, "Libreta Sanitaria Router")
    fecha_v = (date.today() + timedelta(days=60)).isoformat()
    res_crear = client.post("/certificados/", data={
        "id_tipo": str(tipo.id),
        "fechaVencimiento": fecha_v,
        "legajo_persona": "1",
    })
    cert_id = res_crear.json()["id"]

    res_get = client.get(f"/certificados/{cert_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == cert_id

    res_404 = client.get("/certificados/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_router_editar_y_eliminar_certificado(session: Session):
    tipo1 = crear_tipo_certificado(session, "Tipo Uno Router")
    tipo2 = crear_tipo_certificado(session, "Tipo Dos Router")
    fecha_v1 = (date.today() + timedelta(days=45)).isoformat()
    res_crear = client.post("/certificados/", data={
        "id_tipo": str(tipo1.id),
        "fechaVencimiento": fecha_v1,
        "legajo_persona": "1",
    })
    cert_id = res_crear.json()["id"]

    fecha_v2 = (date.today() + timedelta(days=120)).isoformat()
    res_edit = client.put(f"/certificados/{cert_id}", data={
        "id_tipo": str(tipo2.id),
        "fechaVencimiento": fecha_v2,
    })
    assert res_edit.status_code == status.HTTP_200_OK

    res_del = client.delete(f"/certificados/{cert_id}")
    assert res_del.status_code == status.HTTP_200_OK

    res_check = client.get(f"/certificados/{cert_id}")
    assert res_check.status_code == status.HTTP_404_NOT_FOUND

def test_router_archivo_certificado(session: Session):
    tipo = crear_tipo_certificado(session, "Tipo Con Archivo Router")
    fecha_v = (date.today() + timedelta(days=50)).isoformat()
    files = {"archivo": ("doc_cert.pdf", b"%PDF-1.4 contenido", "application/pdf")}
    res_crear = client.post(
        "/certificados/",
        data={
            "id_tipo": str(tipo.id),
            "fechaVencimiento": fecha_v,
            "legajo_persona": "1",
        },
        files=files,
    )
    assert res_crear.status_code == status.HTTP_200_OK
    foto_url = res_crear.json()["foto_url"]
    assert foto_url is not None

    nombre_archivo = foto_url.split("/")[-1]
    res_archivo = client.get(f"/certificados/archivos/{nombre_archivo}")
    assert res_archivo.status_code == status.HTTP_200_OK
