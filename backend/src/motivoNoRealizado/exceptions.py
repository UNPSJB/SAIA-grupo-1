from src.motivoNoRealizado.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

class MotivoYaExiste(BadRequest):
    DETAIL = ErrorCode.MOTIVO_YA_EXISTE

class MotivoNoEncontrado(NotFound):
    DETAIL = ErrorCode.MOTIVO_NO_ENCONTRADO

class MotivoSistemaNoDesactivable(BadRequest):
    DETAIL = ErrorCode.MOTIVO_SISTEMA_NO_DESACTIVABLE
