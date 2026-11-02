from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.tipoCertificado.services import crear_tipo_certificado
from src.certificado.services import crear_certificado

client = TestClient(app)

def test_router_listar_vencimientos_consolidados(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Vencimiento Router")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=6), 1)

    res = client.get("/vencimientos/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    primer_item = data[0]
    assert "origen" in primer_item
    assert "concepto" in primer_item
    assert "dias_restantes" in primer_item
    assert "estado" in primer_item

def test_router_filtrar_vencimientos_por_origen_y_estado(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Vencimiento Filtro Router")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=4), 1)

    res_personal = client.get("/vencimientos/?origen=personal")
    assert res_personal.status_code == status.HTTP_200_OK
    assert all(it["origen"] == "personal" for it in res_personal.json())

    res_proximos = client.get("/vencimientos/?estado=proximo")
    assert res_proximos.status_code == status.HTTP_200_OK
    assert all(it["estado"] == "proximo" for it in res_proximos.json())

def test_router_buscar_vencimientos_por_texto(session: Session):
    tipo = crear_tipo_certificado(session, "Certificado Singular Busqueda")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=7), 1)

    res_busqueda = client.get("/vencimientos/?q=Singular")
    assert res_busqueda.status_code == status.HTTP_200_OK
    assert any("Singular" in it["concepto"] for it in res_busqueda.json())
