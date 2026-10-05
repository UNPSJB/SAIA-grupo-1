from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from src.database import get_db
from src.personal.models import Personal
from src.personal.schemas import Personal as PersonalSchema
from . import schemas, services
from .dependencies import get_usuario_actual

router = APIRouter(
    prefix="/autenticacion",
    tags=["Autenticación"],
)

@router.post("/login", response_model=schemas.TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # El formulario estándar de OAuth2 llama "username" al campo; acá es el usuario.
    persona = services.autenticar(db, form.username, form.password)
    return schemas.TokenResponse(
        access_token=services.crear_token(persona),
        persona=persona,
    )


@router.get("/me", response_model=PersonalSchema)
def me(usuario: Personal = Depends(get_usuario_actual)):
    return usuario
