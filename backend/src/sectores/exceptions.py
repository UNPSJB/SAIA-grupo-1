from src.sectores.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class SectorEnUso(BadRequest):
    DETAIL = ErrorCode.SECTOR_EN_USO

class NombreInvalido(BadRequest):
    DETAIL = ErrorCode.NOMBRE_INVALIDO

class NombreCorto(BadRequest):
    DETAIL = ErrorCode.NOMBRE_CORTO

