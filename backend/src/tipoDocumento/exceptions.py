from src.tipoDocumento.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

TipoVacio = NombreVacio

class TipoDocumentoYaExiste(BadRequest):
    DETAIL = ErrorCode.TIPO_EXISTE

class TipoDocumentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_NO_ENCONTRADO

class TipoDocumentoEnUso(BadRequest):
    DETAIL = ErrorCode.TIPO_ESTA_EN_USO

