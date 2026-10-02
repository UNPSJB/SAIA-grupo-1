from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from src.config import settings
from src.personal.models import Personal
from .exceptions import CredencialesInvalidas, UsuarioInactivo

_hasher = PasswordHash.recommended()

# Hash de relleno: se usa cuando el usuario no existe, para que la respuesta
# tarde lo mismo que con un usuario real (evita adivinar usuarios por el tiempo).
_HASH_FALSO = _hasher.hash("contraseña-que-nadie-usa")


def hashear_contrasenia(contrasenia: str) -> str:
    return _hasher.hash(contrasenia)


def verificar_contrasenia(contrasenia: str, contrasenia_hash: str) -> bool:
    return _hasher.verify(contrasenia, contrasenia_hash)


def autenticar(db: Session, usuario: str, contrasenia: str) -> Personal:
    persona = db.query(Personal).filter(Personal.usuario == usuario.strip().lower()).first()

    tiene_clave = persona is not None and persona.contrasenia_hash is not None
    hash_a_verificar = persona.contrasenia_hash if tiene_clave else _HASH_FALSO
    contrasenia_ok = verificar_contrasenia(contrasenia, hash_a_verificar)

    if not tiene_clave or not contrasenia_ok:
        raise CredencialesInvalidas()
    if not persona.activo:
        raise UsuarioInactivo()
    return persona


def crear_token(persona: Personal) -> str:
    payload = {
        "sub": str(persona.legajo),
        "capacidad": persona.capacidad.value,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
