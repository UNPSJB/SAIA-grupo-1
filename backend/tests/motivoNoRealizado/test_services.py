from tests.database import session
import pytest
from sqlalchemy.orm import Session
from src.motivoNoRealizado import exceptions, schemas, services

def test_service_crear_y_obtener_motivo(session: Session) -> None:
    nuevo = services.crear_motivo(
        session, schemas.MotivoCreate(nombre="Corte de Luz")
    )
    assert nuevo.id is not None
    assert nuevo.nombre == "Corte de Luz"
    assert nuevo.activo is True

    recuperado = services.obtener_motivo(session, nuevo.id)
    assert recuperado.nombre == "Corte de Luz"

def test_service_crear_duplicado(session: Session) -> None:
    services.crear_motivo(session, schemas.MotivoCreate(nombre="Falta de Gas"))
    with pytest.raises(exceptions.MotivoYaExiste):
        services.crear_motivo(session, schemas.MotivoCreate(nombre="  falta de gas  "))

def test_service_crear_nombre_vacio(session: Session) -> None:
    with pytest.raises(exceptions.NombreVacio):
        services.crear_motivo(session, schemas.MotivoCreate(nombre="   "))

def test_service_listar_motivos(session: Session) -> None:
    m1 = services.crear_motivo(session, schemas.MotivoCreate(nombre="Motivo Alpha"))
    m2 = services.crear_motivo(session, schemas.MotivoCreate(nombre="Motivo Beta"))
    services.cambiar_estado_motivo(session, m2.id, activo=False)

    todos = services.listar_motivos(session, solo_activos=False)
    nombres = [m.nombre for m in todos]
    assert "Motivo Alpha" in nombres
    assert "Motivo Beta" in nombres

    activos = services.listar_motivos(session, solo_activos=True)
    nombres_activos = [m.nombre for m in activos]
    assert "Motivo Alpha" in nombres_activos
    assert "Motivo Beta" not in nombres_activos

def test_service_obtener_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.MotivoNoEncontrado):
        services.obtener_motivo(session, 99999)

def test_service_cambiar_estado_motivo(session: Session) -> None:
    m = services.crear_motivo(session, schemas.MotivoCreate(nombre="Motivo Toggle"))
    desactivado = services.cambiar_estado_motivo(session, m.id, activo=False)
    assert desactivado.activo is False

    activado = services.cambiar_estado_motivo(session, m.id, activo=True)
    assert activado.activo is True

def test_service_desactivar_motivo_sistema_otro(session: Session) -> None:
    otro = services.crear_motivo(session, schemas.MotivoCreate(nombre="Otro"))
    with pytest.raises(exceptions.MotivoSistemaNoDesactivable):
        services.cambiar_estado_motivo(session, otro.id, activo=False)
