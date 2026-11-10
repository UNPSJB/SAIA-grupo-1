from src.exceptions import BadRequest, NotFound
from src.tipoInsumo.constants import ErrorCode


class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO


class NombreCorto(BadRequest):
    DETAIL = ErrorCode.NOMBRE_CORTO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class TipoInsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.TIPO_NO_ENCONTRADO


class TipoInsumoEnUso(BadRequest):
    DETAIL = ErrorCode.TIPO_EN_USO
