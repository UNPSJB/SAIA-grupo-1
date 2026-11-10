import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.exceptions import NotAuthenticated, PermissionDenied
from src.personal.models import Personal
from src.personal.schemas import Capacidades

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="autenticacion/login")


def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Personal:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        legajo = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise NotAuthenticated()

    persona = db.query(Personal).filter(Personal.legajo == legajo).first()
    if persona is None or not persona.activo:
        raise NotAuthenticated()
    return persona


def es_administrador(usuario: Personal) -> bool:
    return usuario.capacidad in (Capacidades.ADMINISTRAR, Capacidades.AMBAS)


def es_operador(usuario: Personal) -> bool:
    return usuario.capacidad in (Capacidades.OPERAR, Capacidades.AMBAS)


def requiere_admin(usuario: Personal = Depends(get_usuario_actual)) -> Personal:
    if not es_administrador(usuario):
        raise PermissionDenied()
    return usuario


def requiere_operador(usuario: Personal = Depends(get_usuario_actual)) -> Personal:
    if not es_operador(usuario):
        raise PermissionDenied()
    return usuario
