from src.exceptions import BadRequest, NotFound
from .constants import ErrorCode

class ControlNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONTROL_NO_ENCONTRADO

class VisitaNoEncontrada(NotFound):
    DETAIL = ErrorCode.VISITA_NO_ENCONTRADA

class ControlYaExiste(BadRequest):
    DETAIL = ErrorCode.CONTROL_YA_EXISTE

class PeriodicidadInvalida(BadRequest):
    DETAIL = ErrorCode.PERIOCIDAD_INVALIDA

class FormatoCertificadoInvalido(BadRequest):
    DETAIL = ErrorCode.CERTIFICADO_INVALIDO

class ArchivoVacio(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_VACIO

class FechaRequerida(BadRequest):
    DETAIL = ErrorCode.FECHA_REQUERIDA

class ControlExisteinactivo(BadRequest):
    DETAIL = ErrorCode.CONTROL_EXISTE_INACTIVO