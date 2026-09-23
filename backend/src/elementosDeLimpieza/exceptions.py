from src.elementosDeLimpieza.constants import ErrorCode

from src.exceptions import NotFound, BadRequest

class ElementoNoEncontrado(NotFound):
    DETAIL = ErrorCode.ELEMENTO_NO_ENCONTRADO

class NombreYaExiste(BadRequest):
    DETAIL = ErrorCode.NOMBRE_YA_EXISTE

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO