from typing import List

from src.equipos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class EquipoNoTienePlanes(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_TIENE_NINGUN_PLAN

class NombreConNumeros(BadRequest):
    DETAIL = ErrorCode.NOMBRE_CON_NUMEROS

class UbicacionConNumeros(BadRequest):
    DETAIL= ErrorCode.UBICACION_CON_NUMERO

class CadenaMayorOigualACUATRO(BadRequest):
    DETAIL= ErrorCode.CARACTERES_MAYOR_A_CUATRO

class CATEGORIAInvalida(ValueError):
    def __init__(self, posibles_categorias: List[str]):
        posibles_categorias = ", ".join(posibles_categorias)
        message = f"{ErrorCode.CATEGORIAINVALIDA} {posibles_categorias}."
        super().__init__(message)