import io
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate, Capacidades
from src.documentos.constants import TipoDocumento

client = TestClient(app)

def test_api_crear_documento_y_listar(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=77777777,
        nombre="Valeria",
        apellido="Admin",
        email="valeria.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
    ))

    pdf_bytes = b"%PDF-1.4 contenido de prueba"
    files = {"archivo": ("manual_limpieza.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {
        "titulo": "Manual de Limpieza General",
        "tipo": TipoDocumento.MANUAL_BPM.value,
        "version": "1.0",
        "responsable_legajo": str(admin.legajo),
        "descripcion": "Manual descriptivo",
    }

    res = client.post("/documentos", data=data, files=files)
    assert res.status_code == status.HTTP_201_CREATED
    body = res.json()
    assert body["titulo"] == "Manual de Limpieza General"
    assert body["version_actual"]["version"] == "1.0"
    doc_id = body["id"]

    res_list = client.get("/documentos")
    assert res_list.status_code == status.HTTP_200_OK
    items = res_list.json()
    assert any(i["id"] == doc_id and i["version_actual"] == "1.0" for i in items)

def test_api_subir_nueva_version(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=88888888,
        nombre="Martin",
        apellido="Admin",
        email="martin.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
    ))

    files_v1 = {"archivo": ("receta_v1.pdf", io.BytesIO(b"%PDF-1.4 v1"), "application/pdf")}
    res_crear = client.post(
        "/documentos",
        data={
            "titulo": "Receta Alfajores de Maicena",
            "tipo": TipoDocumento.RECETA.value,
            "version": "1.0",
            "responsable_legajo": str(admin.legajo),
        },
        files=files_v1,
    )
    assert res_crear.status_code == status.HTTP_201_CREATED
    doc_id = res_crear.json()["id"]

    files_v2 = {"archivo": ("receta_v2.pdf", io.BytesIO(b"%PDF-1.4 v2"), "application/pdf")}
    res_v2 = client.post(
        f"/documentos/{doc_id}/versiones",
        data={
            "version": "1.1",
            "responsable_legajo": str(admin.legajo),
        },
        files=files_v2,
    )
    assert res_v2.status_code == status.HTTP_201_CREATED
    body_v2 = res_v2.json()
    assert body_v2["version"] == "1.1"
    assert body_v2["archivado"] is False

    res_doc = client.get(f"/documentos/{doc_id}")
    assert res_doc.status_code == status.HTTP_200_OK
    assert res_doc.json()["version_actual"]["version"] == "1.1"
    assert res_doc.json()["total_versiones"] == 2

def test_api_descargar_archivo_pdf(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=99999999,
        nombre="Clara",
        apellido="Admin",
        email="clara.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
    ))

    pdf_bytes = b"%PDF-1.4 contenido binario especial"
    files = {"archivo": ("procedimiento.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res_crear = client.post(
        "/documentos",
        data={
            "titulo": "Procedimiento de Calibracion",
            "tipo": TipoDocumento.PROCEDIMIENTO.value,
            "version": "1.0",
            "responsable_legajo": str(admin.legajo),
        },
        files=files,
    )
    assert res_crear.status_code == status.HTTP_201_CREATED
    version_id = res_crear.json()["version_actual"]["id"]

    res_descarga = client.get(f"/documentos/archivo/{version_id}")
    assert res_descarga.status_code == status.HTTP_200_OK
    assert res_descarga.headers["content-type"] == "application/pdf"
    assert res_descarga.content == pdf_bytes

def test_api_operador_rechazado_con_403(session: Session):
    operador = crear_personal(session, PersonalCreate(
        documento=10101010,
        nombre="Lucas",
        apellido="Operador",
        email="lucas.op@test.com",
        capacidad=Capacidades.OPERAR,
    ))

    files = {"archivo": ("doc.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
    data = {
        "titulo": "Doc Operador Intento",
        "tipo": TipoDocumento.MANUAL_BPM.value,
        "version": "1.0",
        "responsable_legajo": str(operador.legajo),
    }

    res = client.post("/documentos", data=data, files=files)
    assert res.status_code == status.HTTP_403_FORBIDDEN
