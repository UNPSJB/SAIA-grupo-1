import io
from datetime import date, datetime, timedelta
from typing import Dict
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.certificado.models import Certificado
from src.tipoCertificado.models import TipoCertificado
from src.documentos.models import Documento, VersionDocumento
from src.documentos.constants import TipoDocumento as TipoDocEnum
from src.equipos.models import Categoria, Equipo, Estado
from src.personal.models import Personal
from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.sectores.models import Sector
from src.vencimientos.schemas import EstadoVencimiento, OrigenVencimiento
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios
from tests.database import app, session

client = TestClient(app)


def test_vencimientos_permisos(session: Session, autenticacion_real, usuarios: Dict[str, Personal]):
    res_sin_auth = client.get("/vencimientos/")
    assert res_sin_auth.status_code == status.HTTP_401_UNAUTHORIZED

    operador = usuarios["operador"]
    res_operador = client.get("/vencimientos/", headers=headers(operador))
    assert res_operador.status_code == status.HTTP_403_FORBIDDEN

    admin = usuarios["administrador"]
    res_admin = client.get("/vencimientos/", headers=headers(admin))
    assert res_admin.status_code == status.HTTP_200_OK
    assert isinstance(res_admin.json(), list)


def test_consolidacion_personal_equipo_documento(session: Session, usuarios: Dict[str, Personal]):
    admin = usuarios["administrador"]
    hoy = date.today()

    persona = Personal(
        documento=55112233,
        nombre="Carlos",
        apellido="Tester",
        email="carlos.tester@saia.com",
        usuario="carlos.tester",
        contrasenia_hash="hashed",
        capacidad=usuarios["operador"].capacidad,
        activo=True,
    )
    session.add(persona)
    session.flush()

    tipo_cert = TipoCertificado(nombre="Carnet Manipulación Alimentos")
    session.add(tipo_cert)
    session.flush()

    cert = Certificado(
        legajo_persona=persona.legajo,
        id_tipo=tipo_cert.id,
        fechaVencimiento=datetime.combine(hoy + timedelta(days=5), datetime.min.time()),
        foto_url="carnet.pdf",
    )
    session.add(cert)

    sector = session.query(Sector).first()
    equipo = Equipo(
        nombre="Pasteurizadora Alfa",
        categoria=Categoria.MANTENIMIENTO,
        sector_id=sector.id,
        estado=Estado.ACTIVO,
    )
    session.add(equipo)
    session.flush()

    plan = Plan_de_Calibracion(
        nombre="Calibración Semestral Pasteurizadora",
        fecha_mantenimiento=datetime.combine(hoy - timedelta(days=10), datetime.min.time()),
        fecha_vencimiento=datetime.combine(hoy - timedelta(days=2), datetime.min.time()),
        periodicidad_De_cambio=180,
        descripcion="Control de sondas térmicas",
        equipo_id=equipo.id,
    )
    session.add(plan)

    doc = Documento(
        titulo="Manual de Calidad BPM",
        tipo=TipoDocEnum.MANUAL_BPM,
        activo=True,
    )
    session.add(doc)
    session.flush()

    ver = VersionDocumento(
        documento_id=doc.id,
        version=1,
        archivo_nombre="manual_v1.pdf",
        archivo_nombre_original="manual_v1.pdf",
        tamanio_bytes=1024,
        creado_por_legajo=admin.legajo,
        fecha_vigencia=hoy - timedelta(days=360),
        es_vigente=True,
    )
    session.add(ver)
    session.commit()

    res = client.get("/vencimientos/", headers=headers(admin))
    assert res.status_code == status.HTTP_200_OK
    items = res.json()

    origenes = {item["origen"] for item in items}
    assert "personal" in origenes
    assert "equipo" in origenes
    assert "documento" in origenes

    item_personal = next(it for it in items if it["id"] == f"personal-{cert.id}")
    assert item_personal["concepto"] == "Carnet Manipulación Alimentos"
    assert "Carlos Tester" in item_personal["responsable"]
    assert item_personal["estado"] == EstadoVencimiento.PROXIMO.value

    item_equipo = next(it for it in items if it["id"] == f"equipo-{plan.id}")
    assert item_equipo["concepto"] == "Calibración Semestral Pasteurizadora"
    assert item_equipo["responsable"] == "Pasteurizadora Alfa"
    assert item_equipo["estado"] == EstadoVencimiento.VENCIDO.value

    item_doc = next(it for it in items if it["id"] == f"documento-{doc.id}")
    assert "Manual de Calidad BPM" in item_doc["concepto"]
    assert item_doc["estado"] == EstadoVencimiento.PROXIMO.value


def test_orden_por_urgencia(session: Session, usuarios: Dict[str, Personal]):
    admin = usuarios["administrador"]
    hoy = date.today()

    persona = Personal(
        documento=44112233,
        nombre="Laura",
        apellido="Gomez",
        email="laura.gomez@saia.com",
        usuario="laura.gomez",
        contrasenia_hash="hashed",
        capacidad=usuarios["operador"].capacidad,
        activo=True,
    )
    session.add(persona)
    session.flush()

    tipo = TipoCertificado(nombre="Capacitación Seguridad")
    session.add(tipo)
    session.flush()

    c_vencido = Certificado(
        legajo_persona=persona.legajo,
        id_tipo=tipo.id,
        fechaVencimiento=datetime.combine(hoy - timedelta(days=5), datetime.min.time()),
        foto_url="seg_vencido.pdf",
    )
    c_proximo = Certificado(
        legajo_persona=persona.legajo,
        id_tipo=tipo.id,
        fechaVencimiento=datetime.combine(hoy + timedelta(days=3), datetime.min.time()),
        foto_url="seg_proximo.pdf",
    )
    c_vigente = Certificado(
        legajo_persona=persona.legajo,
        id_tipo=tipo.id,
        fechaVencimiento=datetime.combine(hoy + timedelta(days=120), datetime.min.time()),
        foto_url="seg_vigente.pdf",
    )
    session.add_all([c_vencido, c_proximo, c_vigente])
    session.commit()

    res = client.get("/vencimientos/?origen=personal", headers=headers(admin))
    assert res.status_code == status.HTTP_200_OK
    items = res.json()

    estados = [it["estado"] for it in items]
    peso_map = {"vencido": 0, "proximo": 1, "vigente": 2}
    pesos = [peso_map[e] for e in estados]
    assert pesos == sorted(pesos)


def test_no_muestra_registros_dados_de_baja(session: Session, usuarios: Dict[str, Personal]):
    admin = usuarios["administrador"]
    hoy = date.today()

    persona_baja = Personal(
        documento=99001122,
        nombre="Inactivo",
        apellido="Baja",
        email="inactivo@saia.com",
        usuario="inactivo.baja",
        contrasenia_hash="hashed",
        capacidad=usuarios["operador"].capacidad,
        activo=False,
    )
    session.add(persona_baja)
    session.flush()

    tipo = TipoCertificado(nombre="Certificado Inactivo")
    session.add(tipo)
    session.flush()

    cert_baja = Certificado(
        legajo_persona=persona_baja.legajo,
        id_tipo=tipo.id,
        fechaVencimiento=datetime.combine(hoy + timedelta(days=2), datetime.min.time()),
        foto_url="inactivo.pdf",
    )
    session.add(cert_baja)

    sector = session.query(Sector).first()
    equipo_baja = Equipo(
        nombre="Horno Descartado",
        categoria=Categoria.MANTENIMIENTO,
        sector_id=sector.id,
        estado=Estado.INACTIVO,
    )
    session.add(equipo_baja)
    session.flush()

    plan_baja = Plan_de_Calibracion(
        nombre="Mantenimiento Horno Baja",
        fecha_mantenimiento=datetime.combine(hoy - timedelta(days=2), datetime.min.time()),
        fecha_vencimiento=datetime.combine(hoy + timedelta(days=1), datetime.min.time()),
        periodicidad_De_cambio=30,
        descripcion="No debe aparecer",
        equipo_id=equipo_baja.id,
    )
    session.add(plan_baja)

    doc_baja = Documento(
        titulo="Procedimiento Dado de Baja",
        tipo=TipoDocEnum.PROCEDIMIENTO,
        activo=False,
    )
    session.add(doc_baja)
    session.flush()

    ver_baja = VersionDocumento(
        documento_id=doc_baja.id,
        version=1,
        archivo_nombre="poes_baja.pdf",
        archivo_nombre_original="poes_baja.pdf",
        tamanio_bytes=512,
        creado_por_legajo=admin.legajo,
        fecha_vigencia=hoy - timedelta(days=360),
        es_vigente=True,
    )
    session.add(ver_baja)
    session.commit()

    res = client.get("/vencimientos/", headers=headers(admin))
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    ids = [it["id"] for it in items]

    assert f"personal-{cert_baja.id}" not in ids
    assert f"equipo-{plan_baja.id}" not in ids
    assert f"documento-{doc_baja.id}" not in ids


def test_filtros_origen_estado_y_busqueda(session: Session, usuarios: Dict[str, Personal]):
    admin = usuarios["administrador"]

    res_pers = client.get("/vencimientos/?origen=personal", headers=headers(admin))
    assert res_pers.status_code == status.HTTP_200_OK
    for it in res_pers.json():
        assert it["origen"] == "personal"

    res_eq = client.get("/vencimientos/?origen=equipo", headers=headers(admin))
    assert res_eq.status_code == status.HTTP_200_OK
    for it in res_eq.json():
        assert it["origen"] == "equipo"

    res_doc = client.get("/vencimientos/?origen=documento", headers=headers(admin))
    assert res_doc.status_code == status.HTTP_200_OK
    for it in res_doc.json():
        assert it["origen"] == "documento"

    res_venc = client.get("/vencimientos/?estado=vencido", headers=headers(admin))
    assert res_venc.status_code == status.HTTP_200_OK
    for it in res_venc.json():
        assert it["estado"] == "vencido"
