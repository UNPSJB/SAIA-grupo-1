from tests.database import session
import pytest
from sqlalchemy.orm import Session
from src.sectores import exceptions, schemas, services

def test_service_crear_y_obtener_sector(session: Session) -> None:
    nuevo = services.crear_sector(session, schemas.SectorCreate(nombre="AreaLavado"))
    assert nuevo.id is not None
    assert nuevo.nombre == "AreaLavado"

    recuperado = services.obtener_sector(session, nuevo.id)
    assert recuperado.nombre == "AreaLavado"

def test_service_crear_duplicado(session: Session) -> None:
    services.crear_sector(session, schemas.SectorCreate(nombre="CamarasFrigorificas"))
    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_sector(session, schemas.SectorCreate(nombre="CamarasFrigorificas"))

def test_service_obtener_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.SectorNoEncontrado):
        services.obtener_sector(session, 88888)

def test_service_editar_sector(session: Session) -> None:
    sector = services.crear_sector(session, schemas.SectorCreate(nombre="ZonaA"))
    editado = services.editar_sector(session, sector.id, schemas.SectorUpdate(nombre="ZonaB"))
    assert editado.nombre == "ZonaB"

def test_service_eliminar_sector_en_uso(session: Session) -> None:
    with pytest.raises(exceptions.SectorEnUso):
        services.eliminar_sector(session, 1)

def test_service_eliminar_sector_libre(session: Session) -> None:
    sector = services.crear_sector(session, schemas.SectorCreate(nombre="ZonaTemporal"))
    eliminado = services.eliminar_sector(session, sector.id)
    assert eliminado.id == sector.id
    with pytest.raises(exceptions.SectorNoEncontrado):
        services.obtener_sector(session, sector.id)

