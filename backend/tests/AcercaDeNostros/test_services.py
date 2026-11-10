import pytest
from sqlalchemy.orm import Session
from src.AcercaDeNostros import exceptions
from src.AcercaDeNostros.schemas import AcercaDeNosotrosCreate
from src.AcercaDeNostros.services import (
    actualizarAcercaDeNostros,
    crearAcercaDeNostros,
    obtener_acerca_de_nosotros,
)
from tests.database import session


def test_crear_y_obtener_acerca_de_nosotros(session: Session):
    assert obtener_acerca_de_nosotros(session) is None

    dto = AcercaDeNosotrosCreate(descripcion="Somos una panaderia tradicional familiar")
    creado = crearAcercaDeNostros(session, dto)
    assert creado.id is not None
    assert creado.descripcion == "Somos una panaderia tradicional familiar"

    obtenido = obtener_acerca_de_nosotros(session)
    assert obtenido is not None
    assert obtenido.id == creado.id
    assert obtenido.descripcion == creado.descripcion


def test_actualizar_acerca_de_nosotros(session: Session):
    dto = AcercaDeNosotrosCreate(descripcion="Descripcion inicial")
    creado = crearAcercaDeNostros(session, dto)

    nuevo_dto = AcercaDeNosotrosCreate(descripcion="Descripcion actualizada")
    actualizado = actualizarAcercaDeNostros(session, creado.id, nuevo_dto)
    assert actualizado.id == creado.id
    assert actualizado.descripcion == "Descripcion actualizada"


def test_validacion_descripcion_invalida():
    with pytest.raises(exceptions.Descripcion_vacia):
        AcercaDeNosotrosCreate(descripcion="Texto con caracteres invalidos $$$ !!! @@@")

