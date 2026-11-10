import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.tipoDocumento import exceptions, services

def test_crear_tipo_documento_service(session: Session):
    tipo = services.crear_tipo_documento(session, "Plan HACCP")
    assert tipo.id is not None
    assert tipo.nombre == "Plan HACCP"

def test_crear_tipo_documento_vacio_falla(session: Session):
    with pytest.raises(exceptions.TipoVacio):
        services.crear_tipo_documento(session, "   ")

def test_crear_tipo_documento_duplicado_falla(session: Session):
    services.crear_tipo_documento(session, "Procedimiento Operativo")
    with pytest.raises(exceptions.TipoDocumentoYaExiste):
        services.crear_tipo_documento(session, "procedimiento operativo")

def test_listar_tipos_documentos_service(session: Session):
    services.crear_tipo_documento(session, "Tipo Doc A")
    services.crear_tipo_documento(session, "Tipo Doc B")
    tipos = services.listar_tipos_documentos(session)
    nombres = [t.nombre for t in tipos]
    assert "Tipo Doc A" in nombres
    assert "Tipo Doc B" in nombres

def test_obtener_tipo_documento_service(session: Session):
    creado = services.crear_tipo_documento(session, "Ficha de Proceso")
    obtenido = services.obtener_tipo_documento(session, creado.id)
    assert obtenido.id == creado.id
    assert obtenido.nombre == "Ficha de Proceso"

    with pytest.raises(exceptions.TipoDocumentoNoEncontrado):
        services.obtener_tipo_documento(session, 99999)

def test_actualizar_tipo_documento_service(session: Session):
    creado = services.crear_tipo_documento(session, "Nombre Antiguo")
    actualizado = services.actualizar_tipo_documento(session, creado.id, "Nombre Nuevo")
    assert actualizado.nombre == "Nombre Nuevo"

def test_actualizar_tipo_documento_duplicado_falla(session: Session):
    services.crear_tipo_documento(session, "Doc Existente")
    creado = services.crear_tipo_documento(session, "Doc A Renombrar")
    with pytest.raises(exceptions.TipoDocumentoYaExiste):
        services.actualizar_tipo_documento(session, creado.id, "Doc Existente")

def test_eliminar_tipo_documento_service(session: Session):
    creado = services.crear_tipo_documento(session, "Tipo Para Borrar")
    services.eliminar_tipo_documento(session, creado.id)

    with pytest.raises(exceptions.TipoDocumentoNoEncontrado):
        services.obtener_tipo_documento(session, creado.id)

