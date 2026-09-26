from typing import List

from src.tareas.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class Nombre_Invalido(BadRequest):
    DETAIL=ErrorCode.NOMBRE_ERROR

class NombreConNumeros(BadRequest):
    DETAIL=ErrorCode.NOMBRE_CON_NUMEROS

class TareNoEncontrada(BadRequest):
    DETAIL=ErrorCode.TAREA_NO_ENCONTRADA

class FRECUENCIAInvalida(ValueError):
    def __init__(self, posibles_frecuencias: List[str]):
        posibles_frecuencias = ", ".join(posibles_frecuencias)
        message = f"{ErrorCode.FRECUENCIA_INVALIDA} {posibles_frecuencias}."
        super().__init__(message)

class DescripcionInvalidad(BadRequest):
    DETAIL=ErrorCode.TAREA_CON_CARACTERES_RAROS