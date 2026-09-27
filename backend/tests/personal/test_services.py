import pytest
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from tests.database import session
from src.personal import exceptions
from src.personal.services import (
    listar_personal,
    crear_personal,
    actualizar_personal,
    obtener_personal_por_legajo,
)
from src.personal.schemas import PersonalCreate, PersonalUpdate


def test_crear_personal(session: Session) -> None:
    nombre = "Pepe"
    email = "pepe@gmail.com"
    persona_3 = crear_personal(
        session,
        PersonalCreate(
            documento="30555666", nombre=nombre, apellido="Gomez", email=email
        ),
    )
    assert persona_3.nombre == nombre
    assert persona_3.email == email


def test_modificar_personal(session: Session) -> None:
    nuevo_nombre = "Pepe"
    persona_id = 2
    persona_2 = obtener_personal_por_legajo(session, persona_id)
    assert persona_2.nombre == "Ana"
    persona_2 = actualizar_personal(
        session, persona_id, PersonalUpdate(nombre=nuevo_nombre, email=persona_2.email)
    )
    assert persona_2.nombre == nuevo_nombre


def test_baja_logica_personal(session: Session) -> None:
    # la baja es logica: la persona sigue existiendo pero queda inactiva.
    persona_3 = crear_personal(
        session,
        PersonalCreate(
            documento="30555666", nombre="Pepe", apellido="Gomez", email="pepe@gmail.com"
        ),
    )
    assert persona_3.activo is True
    assert len(listar_personal(session)) == 3

    persona_3 = actualizar_personal(
        session, persona_3.legajo, PersonalUpdate(activo=False)
    )

    assert persona_3.activo is False
    assert len(listar_personal(session)) == 3


def test_obtener_personal_inexistente(session: Session) -> None:
    with pytest.raises(HTTPException) as error:
        obtener_personal_por_legajo(session, 9999)
    assert error.value.status_code == status.HTTP_404_NOT_FOUND


def test_crear_personal_dni_duplicado(session: Session) -> None:
    # 30111222 es el documento de Juan Perez, cargado en tests/database.py
    with pytest.raises(HTTPException) as error:
        crear_personal(
            session,
            PersonalCreate(
                documento="30111222",
                nombre="Pepe",
                apellido="Gomez",
                email="otro@gmail.com",
            ),
        )
    assert error.value.status_code == status.HTTP_400_BAD_REQUEST


def test_listar_personal(session: Session) -> None:
    personal = listar_personal(session)
    assert len(personal) == 2
