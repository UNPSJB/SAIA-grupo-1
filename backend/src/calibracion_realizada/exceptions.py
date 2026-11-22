from src.calibracion_realizada.constants import ErrorCode

from src.exceptions import NotFound, BadRequest


class FECHA_ERROR(BadRequest):
    DETAIL=ErrorCode.FECHA_DE_REALIZACION

class Formato_Invalido(BadRequest):
    DETAIL=ErrorCode.FORMATO_INVALIDO


class Tamanio_Error(BadRequest):
    DETAIL=ErrorCode.TAMANIO_ERROR

class Calibracion_No_Encontrada(NotFound):
    DETAIL=ErrorCode.CALIBRACION_NO_ECONTRADA


class Archivo_Calibracion_No_Encontrado(NotFound):
    DETAIL=ErrorCode.ARCHIVO_NO_ENCONTRADO
