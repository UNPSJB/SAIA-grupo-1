from src.certificado.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class CertificadoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CERTIFICADO_NO_ENCONTRADO

class TipoExiste(BadRequest):
    DETAIL = ErrorCode.TIPO_EXISTE

class TipoVacio(BadRequest):
    DETAIL = ErrorCode.TIPO_VACIO