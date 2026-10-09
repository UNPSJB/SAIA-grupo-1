import io
from datetime import date, timedelta
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
        contrasenia="Clave1234",
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
    assert body["version_actual"]["version"] == 1
    assert body["version_actual"]["es_vigente"] is True
    doc_id = body["id"]

    res_list = client.get("/documentos")
    assert res_list.status_code == status.HTTP_200_OK
    items = res_list.json()
    assert any(i["id"] == doc_id and i["version_actual"] == 1 and i["es_vigente"] is True for i in items)

def test_api_subir_nueva_version(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=88888888,
        nombre="Martin",
        apellido="Admin",
        email="martin.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
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
            "version": "2",
            "responsable_legajo": str(admin.legajo),
        },
        files=files_v2,
    )
    assert res_v2.status_code == status.HTTP_201_CREATED
    body_v2 = res_v2.json()
    assert body_v2["version"] == 2
    assert body_v2["archivado"] is False

    res_doc = client.get(f"/documentos/{doc_id}")
    assert res_doc.status_code == status.HTTP_200_OK
    assert res_doc.json()["version_vigente"]["version"] == 1
    assert res_doc.json()["total_versiones"] == 2

def test_api_marcar_version_vigente_y_trazabilidad(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=89898989,
        nombre="Lorena",
        apellido="Admin",
        email="lorena.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    files_v1 = {"archivo": ("receta_v1.pdf", io.BytesIO(b"%PDF-1.4 v1"), "application/pdf")}
    res_crear = client.post(
        "/documentos",
        data={
            "titulo": "Receta Scons de Queso",
            "tipo": TipoDocumento.RECETA.value,
            "version": "1.0",
            "responsable_legajo": str(admin.legajo),
        },
        files=files_v1,
    )
    doc_id = res_crear.json()["id"]

    files_v2 = {"archivo": ("receta_v2.pdf", io.BytesIO(b"%PDF-1.4 v2"), "application/pdf")}
    res_v2 = client.post(
        f"/documentos/{doc_id}/versiones",
        data={
            "version": "2.0",
            "responsable_legajo": str(admin.legajo),
        },
        files=files_v2,
    )
    version_2_id = res_v2.json()["id"]

    fecha_v = (date.today() + timedelta(days=2)).isoformat()
    res_vigente = client.post(
        f"/documentos/{doc_id}/versiones/{version_2_id}/vigente",
        json={
            "fecha_vigencia": fecha_v,
        },
        headers={"X-User-Legajo": str(admin.legajo)},
    )
    assert res_vigente.status_code == status.HTTP_200_OK
    assert res_vigente.json()["es_vigente"] is True
    assert res_vigente.json()["fecha_vigencia"] == fecha_v

    res_list = client.get(f"/documentos")
    doc_en_lista = [d for d in res_list.json() if d["id"] == doc_id][0]
    assert doc_en_lista["version_actual"] == 2
    assert doc_en_lista["es_vigente"] is True

    res_versiones = client.get(f"/documentos/{doc_id}/versiones")
    assert res_versiones.status_code == status.HTTP_200_OK
    versiones = res_versiones.json()
    assert len(versiones) == 2
    vigentes = [v for v in versiones if v["es_vigente"]]
    assert len(vigentes) == 1
    assert vigentes[0]["version"] == 2

    res_auditoria = client.get(f"/auditoria/?tabla=documentos&registro_id={doc_id}")
    assert res_auditoria.status_code == status.HTTP_200_OK
    auditorias = res_auditoria.json()
    assert len(auditorias) >= 2
    assert any(a["accion"].upper() == "MODIFICAR" and a["campo"] == "version_vigente" and "2" in a["valor_posterior"] for a in auditorias)

def test_api_descargar_archivo_pdf(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=99999999,
        nombre="Clara",
        apellido="Admin",
        email="clara.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
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
        contrasenia="Clave1234",
    ))

    admin = crear_personal(session, PersonalCreate(
        documento=10101011,
        nombre="Javier",
        apellido="Admin",
        email="javier.ad@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    files = {"archivo": ("doc.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
    data = {
        "titulo": "Doc Operador Intento",
        "tipo": TipoDocumento.MANUAL_BPM.value,
        "version": "1.0",
        "responsable_legajo": str(operador.legajo),
    }

    res = client.post("/documentos", data=data, files=files, headers={"X-User-Legajo": str(operador.legajo)})
    assert res.status_code == status.HTTP_403_FORBIDDEN

    files_admin = {"archivo": ("doc.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
    res_crear = client.post(
        "/documentos",
        data={
            "titulo": "Doc Para Probar Vigencia",
            "tipo": TipoDocumento.MANUAL_BPM.value,
            "version": "1.0",
        },
        files=files_admin,
        headers={"X-User-Legajo": str(admin.legajo)},
    )
    doc_id = res_crear.json()["id"]
    version_id = res_crear.json()["version_actual"]["id"]

    res_vigente_op = client.post(
        f"/documentos/{doc_id}/versiones/{version_id}/vigente",
        json={
            "fecha_vigencia": date.today().isoformat(),
        },
        headers={"X-User-Legajo": str(operador.legajo)},
    )
    assert res_vigente_op.status_code == status.HTTP_403_FORBIDDEN

def test_api_versionado_automatico_sin_campo_version(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=77733344,
        nombre="Carla",
        apellido="Admin",
        email="carla.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    files_v1 = {"archivo": ("doc_v1.pdf", io.BytesIO(b"%PDF-1.4 test v1"), "application/pdf")}
    res_crear = client.post(
        "/documentos",
        data={
            "titulo": "Procedimiento Desinfeccion",
            "tipo": TipoDocumento.PROCEDIMIENTO.value,
        },
        files=files_v1,
        headers={"X-User-Legajo": str(admin.legajo)},
    )
    assert res_crear.status_code == status.HTTP_201_CREATED
    data_crear = res_crear.json()
    assert data_crear["version_actual"]["version"] == 1
    doc_id = data_crear["id"]

    files_v2 = {"archivo": ("doc_v2.pdf", io.BytesIO(b"%PDF-1.4 test v2"), "application/pdf")}
    res_v2 = client.post(
        f"/documentos/{doc_id}/versiones",
        files=files_v2,
        headers={"X-User-Legajo": str(admin.legajo)},
    )
    assert res_v2.status_code == status.HTTP_201_CREATED
    assert res_v2.json()["version"] == 2

    files_v3 = {"archivo": ("doc_v3.pdf", io.BytesIO(b"%PDF-1.4 test v3"), "application/pdf")}
    res_v3 = client.post(
        f"/documentos/{doc_id}/versiones",
        files=files_v3,
        headers={"X-User-Legajo": str(admin.legajo)},
    )
    assert res_v3.status_code == status.HTTP_201_CREATED
    assert res_v3.json()["version"] == 3

