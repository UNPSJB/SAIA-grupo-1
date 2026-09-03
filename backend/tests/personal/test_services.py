import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.personal import exceptions
from src.personal.services import (
    listar_personal,
    crear_personal,
    modificar_personal,
    leer_personal,
    eliminar_persona
)
from src.personal.schemas import PersonalCreate, PersonalUpdate


def test_crear_personal(session: Session) -> None:
    nombre = "Pepe"
    email = "pepe@gmail.com"
    persona_3 = crear_personal(session, PersonalCreate(nombre=nombre, email=email))
    assert persona_3.nombre == nombre
    assert persona_3.email == email


def test_modificar_personal(session: Session) -> None:
    nuevo_nombre = "Pepe"
    persona_id = 2
    persona_2 = leer_personal(session, persona_id)
    assert persona_2.nombre == "Ana"
    persona_2 = modificar_personal(
        session, persona_id, PersonalUpdate(nombre=nuevo_nombre, email=persona_2.email)
    )
    assert persona_2.nombre == nuevo_nombre

def test_eliminar_personal(session: Session) -> None:


    # probamos crear una persona nueva y eliminarla.
    nombre = "Pepe"
    email = "pepe@gmail.com"
    persona_3 = crear_personal(session, PersonalCreate(nombre=nombre, email=email))

    personas = listar_personal(session)
    assert len(personas) == 3

    persona_3 = eliminar_persona(session, persona_3.id)

    personas = listar_personal(session)
    assert len(personas) == 2


def test_listar_personal(session: Session) -> None:
    personal = listar_personal(session)
    assert len(personal) == 2
