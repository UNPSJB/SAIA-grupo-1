from datetime import date, datetime, timedelta
import io
from fastapi import UploadFile
from sqlalchemy.orm import Session
from tests.database import session
from src.personal.models import Personal
from src.personal.schemas import Capacidades, PersonalCreate
from src.personal.services import crear_personal
from src.tipoCertificado.services import crear_tipo_certificado
from src.certificado.services import crear_certificado
from src.plan_de_calibracion.schemas import PlanDeCalibracionCreate
from src.plan_de_calibracion.services import crear_plan
from src.documentos.services import crear_documento

from src.vencimientos import schemas, services

def test_vencimientos_consolidados_incluye_certificados_y_equipos(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Vencimiento Service")
    venc_proximo = date.today() + timedelta(days=5)
    crear_certificado(session, tipo.id, venc_proximo, 1)

    mantenimiento = datetime.now() + timedelta(days=2)
    plan_create = PlanDeCalibracionCreate(
        nombre="Calibracion Horno Vencimientos",
        periodicidad_De_cambio=10,
        fecha_mantenimiento=mantenimiento,
        descripcion="Test vencimientos",
        equipo_id=1,
        fecha_vencimiento=mantenimiento,
    )
    crear_plan(session, plan_create)

    items = services.listar_vencimientos_consolidados(session)
    assert len(items) >= 2

    origenes = [it.origen for it in items]
    assert schemas.OrigenVencimiento.PERSONAL in origenes
    assert schemas.OrigenVencimiento.EQUIPO in origenes

def test_vencimientos_filtrar_por_origen(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Filtro Origen")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=8), 1)

    solo_personal = services.listar_vencimientos_consolidados(session, origen=schemas.OrigenVencimiento.PERSONAL)
    assert all(it.origen == schemas.OrigenVencimiento.PERSONAL for it in solo_personal)

    solo_equipos = services.listar_vencimientos_consolidados(session, origen=schemas.OrigenVencimiento.EQUIPO)
    assert all(it.origen == schemas.OrigenVencimiento.EQUIPO for it in solo_equipos)

def test_vencimientos_filtrar_por_estado_y_busqueda(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Busqueda Exclusiva")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=3), 1)

    proximos = services.listar_vencimientos_consolidados(session, estado=schemas.EstadoVencimiento.PROXIMO)
    assert all(it.estado == schemas.EstadoVencimiento.PROXIMO for it in proximos)

    busqueda = services.listar_vencimientos_consolidados(session, q="Exclusiva")
    assert len(busqueda) >= 1
    assert any("Exclusiva" in it.concepto for it in busqueda)

def test_vencimientos_estados_vencido_y_vigente(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Estados Plazo")
    crear_certificado(session, tipo.id, date.today() + timedelta(days=60), 1)

    mantenimiento = datetime.now() + timedelta(days=2)
    plan_create = PlanDeCalibracionCreate(
        nombre="Plan Vencido Equipo",
        periodicidad_De_cambio=1,
        fecha_mantenimiento=mantenimiento,
        descripcion="Vencido",
        equipo_id=1,
        fecha_vencimiento=mantenimiento,
    )
    plan_obj = crear_plan(session, plan_create)
    plan_obj.fecha_vencimiento = datetime.now() - timedelta(days=20)
    session.commit()

    vencidos = services.listar_vencimientos_consolidados(session, estado=schemas.EstadoVencimiento.VENCIDO)
    assert len(vencidos) >= 1

    vigentes = services.listar_vencimientos_consolidados(session, estado=schemas.EstadoVencimiento.VIGENTE)
    assert len(vigentes) >= 1

def test_vencimientos_documentos(session: Session):
    admin = crear_personal(
        session,
        PersonalCreate(
            documento=90909090,
            nombre="Admin",
            apellido="Vencimientos",
            email="admin.venc@gmail.com",
            capacidad=Capacidades.ADMINISTRAR,
            contrasenia="Clave1234",
        ),
    )
    archivo_pdf = UploadFile(filename="doc_venc.pdf", file=io.BytesIO(b"%PDF-1.4 doc"))
    crear_documento(
        session,
        titulo="Procedimiento Seguridad Venc",
        tipo="Procedimiento",
        version="1",
        file=archivo_pdf,
        responsable_legajo=admin.legajo,
        fecha_vencimiento=date.today() + timedelta(days=30),
    )

    docs_venc = services.listar_vencimientos_consolidados(session, origen=schemas.OrigenVencimiento.DOCUMENTO)
    assert len(docs_venc) >= 1
    assert any(it.origen == schemas.OrigenVencimiento.DOCUMENTO for it in docs_venc)

def test_documento_vencido_aparece_como_vencido(session: Session):
    admin = crear_personal(
        session,
        PersonalCreate(
            documento=91919191,
            nombre="Admin2",
            apellido="Vencimientos2",
            email="admin2.venc@gmail.com",
            capacidad=Capacidades.ADMINISTRAR,
            contrasenia="Clave1234",
        ),
    )
    archivo_pdf = UploadFile(filename="doc_exp.pdf", file=io.BytesIO(b"%PDF-1.4 doc"))
    crear_documento(
        session,
        titulo="Procedimiento Caducado",
        tipo="Procedimiento",
        version="1",
        file=archivo_pdf,
        responsable_legajo=admin.legajo,
        fecha_vencimiento=date.today() - timedelta(days=5),
    )

    docs_vencidos = services.listar_vencimientos_consolidados(
        session,
        origen=schemas.OrigenVencimiento.DOCUMENTO,
        estado=schemas.EstadoVencimiento.VENCIDO,
    )
    assert any(it.concepto == "Procedimiento Caducado (v1)" and it.estado == schemas.EstadoVencimiento.VENCIDO for it in docs_vencidos)
