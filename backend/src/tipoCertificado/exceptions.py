from src.tipoCertificado.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

class TipoCertificadoYaExiste(BadRequest):
    DETAIL = ErrorCode.TIPO_EXISTE

class TipoCertificadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_NO_ENCONTRADO

class TipoCertificadoEnUso(BadRequest):
    DETAIL = ErrorCode.TIPO_ESTA_EN_USO