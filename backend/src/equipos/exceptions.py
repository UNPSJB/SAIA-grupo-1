from src.equipos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class EquipoNoTienePlanes(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_TIENE_NINGUN_PLAN