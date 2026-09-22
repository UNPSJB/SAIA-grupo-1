from typing import List
from src.auditoria.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class AuditoriaNoEncontrada(NotFound):
    DETAIL = ErrorCode.AUDITORIA_NO_ENCONTRADA


class AccionAuditoriaInvalida(ValueError):
    def __init__(self, posibles_acciones: List[str]):
        posibles_acciones = ", ".join(posibles_acciones)
        message = f"{ErrorCode.ACCION_INVALIDA} {posibles_acciones}."
        super().__init__(message)


class TablaAuditoriaVacia(BadRequest):
    DETAIL = ErrorCode.TABLA_VACIA
