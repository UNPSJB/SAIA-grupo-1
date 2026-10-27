from datetime import date, datetime, timedelta
import io
import pytest
from fastapi import UploadFile
from sqlalchemy.orm import Session
from tests.database import session
from src.tipoCertificado.services import crear_tipo_certificado
from src.certificado import exceptions, services
from src.certificado.schemas import CertificadoCreate, CertificadoUpdate

def test_crear_y_obtener_certificado_service(session: Session):
    tipo = crear_tipo_certificado(session, "Carnet Bromatologia")
    vencimiento = date.today() + timedelta(days=90)
    cert = services.crear_certificado(
        db=session,
        id_tipo=tipo.id,
        fechaVencimiento=vencimiento,
        legajo_persona=1,
    )
    assert cert.id is not None
    assert cert.id_tipo == tipo.id
    assert cert.legajo_persona == 1
    assert cert.fechaVencimiento.date() == vencimiento

    obtenido = services.obtener_certificado(session, cert.id)
    assert obtenido.id == cert.id

def test_crear_certificado_persona_inexistente_falla(session: Session):
    tipo = crear_tipo_certificado(session, "Tipo Validacion Persona")
    with pytest.raises(exceptions.PersonaNoExiste):
        services.crear_certificado(
            db=session,
            id_tipo=tipo.id,
            fechaVencimiento=date.today() + timedelta(days=30),
            legajo_persona=99999,
        )

def test_listar_certificados_filtro_persona(session: Session):
    tipo = crear_tipo_certificado(session, "Tipo Filtro Lista")
    cert1 = services.crear_certificado(session, tipo.id, date.today() + timedelta(days=60), 1)
    cert2 = services.crear_certificado(session, tipo.id, date.today() + timedelta(days=60), 2)

    del_1 = services.listar_certificados(session, legajo_persona=1)
    ids_1 = [c.id for c in del_1]
    assert cert1.id in ids_1
    assert cert2.id not in ids_1

def test_editar_certificado_service(session: Session):
    tipo1 = crear_tipo_certificado(session, "Tipo Inicial")
    tipo2 = crear_tipo_certificado(session, "Tipo Modificado")
    cert = services.crear_certificado(session, tipo1.id, date.today() + timedelta(days=40), 1)

    nuevo_venc = date.today() + timedelta(days=120)
    editado = services.editar_certificado(session, cert.id, tipo2.id, nuevo_venc)
    assert editado.id_tipo == tipo2.id
    assert editado.fechaVencimiento.date() == nuevo_venc

def test_eliminar_certificado_service(session: Session):
    tipo = crear_tipo_certificado(session, "Tipo Borrar")
    cert = services.crear_certificado(session, tipo.id, date.today() + timedelta(days=30), 1)
    services.eliminar_certificado(session, cert.id)

    with pytest.raises(exceptions.CertificadoNoEncontrado):
        services.obtener_certificado(session, cert.id)

def test_archivo_certificado_servicios(session: Session):
    archivo_pdf = UploadFile(filename="carnet.pdf", file=io.BytesIO(b"%PDF-1.4 contenido"))
    url = services.guardar_archivo_certificado(archivo_pdf)
    assert url.startswith("/certificados/archivos/")

    nombre_archivo = url.split("/")[-1]
    response = services.obtener_archivo_certificado(nombre_archivo)
    assert response is not None

    with pytest.raises(exceptions.CertificadoNoEncontrado):
        services.obtener_archivo_certificado("inexistente.pdf")

    archivo_invalido = UploadFile(filename="invalido.txt", file=io.BytesIO(b"texto plano"), headers={"content-type": "text/plain"})
    with pytest.raises(ValueError):
        services.guardar_archivo_certificado(archivo_invalido)

    archivo_vacio = UploadFile(filename="vacio.pdf", file=io.BytesIO(b""))
    with pytest.raises(ValueError):
        services.guardar_archivo_certificado(archivo_vacio)

def test_certificado_con_archivo_ciclo_completo(session: Session):
    tipo = crear_tipo_certificado(session, "Tipo Con Archivo")
    archivo1 = UploadFile(filename="cert1.pdf", file=io.BytesIO(b"%PDF-1.4 cert 1"))
    cert = services.crear_certificado(
        session,
        id_tipo=tipo.id,
        fechaVencimiento=date.today() + timedelta(days=45),
        legajo_persona=1,
        archivo=archivo1,
    )
    assert cert.foto_url is not None

    archivo2 = UploadFile(filename="cert2.pdf", file=io.BytesIO(b"%PDF-1.4 cert 2"))
    editado = services.editar_certificado(
        session,
        certificado_id=cert.id,
        id_tipo=tipo.id,
        fechaVencimiento=date.today() + timedelta(days=60),
        archivo=archivo2,
    )
    assert editado.foto_url is not None

    services.eliminar_certificado(session, cert.id)
    with pytest.raises(exceptions.CertificadoNoEncontrado):
        services.obtener_certificado(session, cert.id)

def test_validaciones_schemas_certificado():
    fecha_invalida = datetime.now() + timedelta(days=2)
    with pytest.raises(exceptions.FechaVencimientoInvalida):
        CertificadoCreate.validar_fecha_vencimiento(fecha_invalida)

    with pytest.raises(exceptions.FechaVencimientoInvalida):
        CertificadoUpdate.validar_fecha_vencimiento(fecha_invalida)
