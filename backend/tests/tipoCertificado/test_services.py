import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.tipoCertificado import exceptions, services

def test_crear_tipo_certificado_service(session: Session):
    tipo = services.crear_tipo_certificado(session, "Carnet Manipulacion Segura")
    assert tipo.id is not None
    assert tipo.nombre == "Carnet Manipulacion Segura"

def test_crear_tipo_certificado_vacio_falla(session: Session):
    with pytest.raises(exceptions.TipoVacio):
        services.crear_tipo_certificado(session, "   ")

def test_crear_tipo_certificado_duplicado_falla(session: Session):
    services.crear_tipo_certificado(session, "Curso Higiene Alimentos")
    with pytest.raises(exceptions.TipoCertificadoYaExiste):
        services.crear_tipo_certificado(session, "curso higiene alimentos")

def test_listar_tipos_certificados_service(session: Session):
    serv1 = services.crear_tipo_certificado(session, "Tipo Test A")
    serv2 = services.crear_tipo_certificado(session, "Tipo Test B")
    tipos = services.listar_tipos_certificados(session)
    nombres = [t.nombre for t in tipos]
    assert "Tipo Test A" in nombres
    assert "Tipo Test B" in nombres

def test_obtener_tipo_certificado_service(session: Session):
    creado = services.crear_tipo_certificado(session, "Libreta Bromatologica")
    obtenido = services.obtener_tipo_certificado(session, creado.id)
    assert obtenido.id == creado.id
    assert obtenido.nombre == "Libreta Bromatologica"

    with pytest.raises(exceptions.TipoCertificadoNoEncontrado):
        services.obtener_tipo_certificado(session, 99999)

def test_eliminar_tipo_certificado_service(session: Session):
    creado = services.crear_tipo_certificado(session, "Tipo Para Eliminar")
    services.eliminar_tipo_certificado(session, creado.id)

    with pytest.raises(exceptions.TipoCertificadoNoEncontrado):
        services.obtener_tipo_certificado(session, creado.id)

def test_crear_tipo_certificado_largo_150_caracteres(session: Session):
    nombre_150 = "A" * 150
    tipo = services.crear_tipo_certificado(session, nombre_150)
    assert tipo.id is not None
    assert tipo.nombre == nombre_150
    assert len(tipo.nombre) == 150
