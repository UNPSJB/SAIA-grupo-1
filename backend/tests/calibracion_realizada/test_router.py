from datetime import datetime, timedelta
import io
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.plan_de_calibracion.schemas import PlanDeCalibracionCreate
from src.plan_de_calibracion.services import crear_plan

client = TestClient(app)

def _crear_plan_aux(session: Session, equipo_id: int = 1):
    return crear_plan(
        session,
        PlanDeCalibracionCreate(
            nombre="Plan Router Cal Realizada",
            periodicidad_De_cambio=60,
            fecha_mantenimiento=datetime.now() + timedelta(days=5),
            descripcion="Plan para tests",
            equipo_id=equipo_id,
        ),
    )

def test_router_crear_y_listar_calibracion_realizada(session: Session):
    plan = _crear_plan_aux(session, 1)
    fecha_cal = (datetime.now() + timedelta(minutes=5)).isoformat()
    payload = {
        "fecha_d_realizacion": fecha_cal,
        "formato_archivo": "cert_balanza_ok.pdf",
        "plan_calibracion_id": plan.id,
    }
    res_crear = client.post("/calibracion_realizada/", json=payload)
    assert res_crear.status_code == status.HTTP_200_OK
    cal_id = res_crear.json()["id"]

    res_listar = client.get("/calibracion_realizada/")
    assert res_listar.status_code == status.HTTP_200_OK
    assert any(c["id"] == cal_id for c in res_listar.json())

def test_router_obtener_calibracion_realizada(session: Session):
    plan = _crear_plan_aux(session, 2)
    payload = {
        "fecha_d_realizacion": (datetime.now() + timedelta(minutes=5)).isoformat(),
        "formato_archivo": "cert_termometro_ok.pdf",
        "plan_calibracion_id": plan.id,
    }
    res_crear = client.post("/calibracion_realizada/", json=payload)
    cal_id = res_crear.json()["id"]

    res_get = client.get(f"/calibracion_realizada/{cal_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == cal_id

    res_404 = client.get("/calibracion_realizada/99999")
    assert res_404.status_code == status.HTTP_400_BAD_REQUEST

def test_router_upload_certificado_calibracion(session: Session):
    archivo_pdf = io.BytesIO(b"%PDF-1.4 dummy certificate")
    res_upload = client.post(
        "/calibracion_realizada/upload-certificado",
        files={"formato_archivo": ("certificado_patron.pdf", archivo_pdf, "application/pdf")},
    )
    assert res_upload.status_code == status.HTTP_200_OK
    assert "ruta" in res_upload.json()
    ruta = res_upload.json()["ruta"]

    res_descarga = client.get("/calibracion_realizada/archivos/certificado_patron.pdf")
    assert res_descarga.status_code == status.HTTP_200_OK

    res_inline = client.get("/calibracion_realizada/archivos/certificado_patron.pdf?inline=true")
    assert res_inline.status_code == status.HTTP_200_OK

    res_404 = client.get("/calibracion_realizada/archivos/no_existe.pdf")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

    import os
    if os.path.exists(ruta):
        os.remove(ruta)
