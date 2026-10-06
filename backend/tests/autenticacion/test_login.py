from datetime import datetime, timedelta, timezone
from typing import Dict
import jwt
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.config import settings
from src.personal.models import Personal
from tests.autenticacion.conftest import CONTRASENIA, headers
from tests.database import app

client = TestClient(app)


def _login(usuario: str, contrasenia: str):
    return client.post("/autenticacion/login", data={"username": usuario, "password": contrasenia})


def _token(sub: str, minutos: int = 60, clave: str = settings.JWT_SECRET) -> str:
    payload = {"sub": sub, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutos)}
    return jwt.encode(payload, clave, algorithm=settings.JWT_ALGORITHM)


def test_login_correcto(usuarios: Dict[str, Personal]) -> None:
    response = _login("juan.perez", CONTRASENIA)
    assert response.status_code == status.HTTP_200_OK
    cuerpo = response.json()
    assert cuerpo["token_type"] == "bearer"
    assert cuerpo["access_token"]
    assert cuerpo["persona"]["usuario"] == "juan.perez"
    assert "contrasenia" not in cuerpo["persona"]
    assert "contrasenia_hash" not in cuerpo["persona"]


def test_login_ignora_mayusculas_en_el_usuario(usuarios: Dict[str, Personal]) -> None:
    assert _login("Juan.Perez", CONTRASENIA).status_code == status.HTTP_200_OK


def test_login_contrasenia_incorrecta_y_usuario_inexistente_dan_el_mismo_error(
    usuarios: Dict[str, Personal],
) -> None:
    mala = _login("juan.perez", "incorrecta")
    inexistente = _login("nadie.nada", CONTRASENIA)
    assert mala.status_code == inexistente.status_code == status.HTTP_401_UNAUTHORIZED
    assert mala.json() == inexistente.json()


def test_login_persona_sin_contrasenia(session: Session, usuarios: Dict[str, Personal]) -> None:
    usuarios["operador"].contrasenia_hash = None
    session.commit()
    assert _login("juan.perez", CONTRASENIA).status_code == status.HTTP_401_UNAUTHORIZED


def test_login_usuario_inactivo(session: Session, usuarios: Dict[str, Personal]) -> None:
    usuarios["operador"].activo = False
    session.commit()
    assert _login("juan.perez", CONTRASENIA).status_code == status.HTTP_403_FORBIDDEN
    # con contrasenia mala NO se revela que esta inactivo
    assert _login("juan.perez", "incorrecta").status_code == status.HTTP_401_UNAUTHORIZED


def test_me_con_token(usuarios: Dict[str, Personal]) -> None:
    response = client.get("/autenticacion/me", headers=headers(usuarios["operador"]))
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["usuario"] == "juan.perez"


def test_me_sin_token(usuarios: Dict[str, Personal]) -> None:
    assert client.get("/autenticacion/me").status_code == status.HTTP_401_UNAUTHORIZED


def test_me_token_basura(usuarios: Dict[str, Personal]) -> None:
    response = client.get("/autenticacion/me", headers={"Authorization": "Bearer xxx"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_token_vencido(usuarios: Dict[str, Personal]) -> None:
    response = client.get("/autenticacion/me", headers={"Authorization": f"Bearer {_token('1', minutos=-1)}"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_token_firmado_con_otra_clave(usuarios: Dict[str, Personal]) -> None:
    token = _token("1", clave="una-clave-falsa-de-32-caracteres-o-mas")
    response = client.get("/autenticacion/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_token_de_persona_inexistente(usuarios: Dict[str, Personal]) -> None:
    response = client.get("/autenticacion/me", headers={"Authorization": f"Bearer {_token('9999')}"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_token_deja_de_servir_si_la_persona_se_da_de_baja(
    session: Session, usuarios: Dict[str, Personal]
) -> None:
    cabeceras = headers(usuarios["operador"])
    assert client.get("/autenticacion/me", headers=cabeceras).status_code == status.HTTP_200_OK
    usuarios["operador"].activo = False
    session.commit()
    assert client.get("/autenticacion/me", headers=cabeceras).status_code == status.HTTP_401_UNAUTHORIZED
