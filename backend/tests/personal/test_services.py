import pytest
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session
from src.autenticacion.services import verificar_contrasenia
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
            documento="30555666", nombre=nombre, apellido="Gomez", email=email,
            contrasenia="Clave1234",
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
            documento="30555666", nombre="Pepe", apellido="Gomez", email="pepe@gmail.com",
            contrasenia="Clave1234",
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
                contrasenia="Clave1234",
            ),
        )
    assert error.value.status_code == status.HTTP_400_BAD_REQUEST


def test_usuario_autogenerado(session: Session) -> None:
    # Juan Perez (tests/database.py) y Ana Dominguez ya existen
    assert obtener_personal_por_legajo(session, 1).usuario == "juan.perez"
    assert obtener_personal_por_legajo(session, 2).usuario == "ana.dominguez"


def test_usuario_sin_tildes_ni_espacios(session: Session) -> None:
    persona = crear_personal(
        session,
        PersonalCreate(
            documento="30777888", nombre="María José", apellido="De la Cruz Núñez",
            email="mj@gmail.com", contrasenia="Clave1234",
        ),
    )
    assert persona.usuario == "maria.delacruznunez"


def test_usuario_repetido_agrega_numero(session: Session) -> None:
    otro_juan = crear_personal(
        session,
        PersonalCreate(
            documento="30999000", nombre="Juan", apellido="Perez",
            email="otro.juan@gmail.com", contrasenia="Clave1234",
        ),
    )
    assert otro_juan.usuario == "juan.perez2"


def test_usuario_no_cambia_al_editar_nombre(session: Session) -> None:
    persona = actualizar_personal(session, 1, PersonalUpdate(nombre="Pedro"))
    assert persona.nombre == "Pedro"
    assert persona.usuario == "juan.perez"


def test_contrasenia_se_guarda_hasheada(session: Session) -> None:
    persona = obtener_personal_por_legajo(session, 1)
    assert persona.contrasenia_hash is not None
    assert persona.contrasenia_hash != "Clave1234"
    assert verificar_contrasenia("Clave1234", persona.contrasenia_hash)


def test_actualizar_contrasenia(session: Session) -> None:
    persona = actualizar_personal(session, 1, PersonalUpdate(contrasenia="NuevaClave99"))
    assert verificar_contrasenia("NuevaClave99", persona.contrasenia_hash)
    assert not verificar_contrasenia("Clave1234", persona.contrasenia_hash)


def test_editar_otros_datos_no_toca_contrasenia(session: Session) -> None:
    hash_antes = obtener_personal_por_legajo(session, 1).contrasenia_hash
    persona = actualizar_personal(session, 1, PersonalUpdate(nombre="Pedro"))
    assert persona.contrasenia_hash == hash_antes


def test_contrasenia_corta_es_invalida() -> None:
    with pytest.raises(ValidationError):
        PersonalCreate(
            documento="30111222", nombre="Pepe", apellido="Gomez",
            email="pepe@gmail.com", contrasenia="corta",
        )


def test_listar_personal(session: Session) -> None:
    personal = listar_personal(session)
    assert len(personal) == 2
