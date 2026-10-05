from typing import Dict, Generator
import pytest
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual
from src.autenticacion.services import crear_token
from src.personal.models import Personal
from src.personal.schemas import Capacidades, PersonalCreate
from src.personal.services import crear_personal
from tests.database import app, session  # noqa: F401  (session es una fixture)

CONTRASENIA = "Clave1234"


@pytest.fixture
def autenticacion_real() -> Generator[None, None, None]:
    """Quita el usuario simulado de tests/database.py: los endpoints validan tokens de verdad."""
    simulado = app.dependency_overrides.pop(get_usuario_actual)
    yield
    app.dependency_overrides[get_usuario_actual] = simulado


def _crear(session: Session, doc: str, nombre: str, apellido: str, capacidad: Capacidades) -> Personal:
    return crear_personal(
        session,
        PersonalCreate(
            documento=doc, nombre=nombre, apellido=apellido,
            email=f"{nombre.lower()}.{apellido.lower()}@gmail.com",
            capacidad=capacidad, contrasenia=CONTRASENIA,
        ),
    )


@pytest.fixture
def usuarios(session: Session, autenticacion_real: None) -> Dict[str, Personal]:
    """Un usuario por rol. 'operador' es Juan Perez (legajo 1, el del seed de tests)."""
    return {
        "operador": session.get(Personal, 1),
        "administrador": _crear(session, "40000001", "Admin", "Uno", Capacidades.ADMINISTRAR),
        "ambos": _crear(session, "40000002", "Ambos", "Dos", Capacidades.AMBAS),
    }


def headers(persona: Personal) -> Dict[str, str]:
    return {"Authorization": f"Bearer {crear_token(persona)}"}
