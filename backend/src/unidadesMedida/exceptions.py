from src.exceptions import BadRequest, NotFound
from src.unidadesMedida.constants import ErrorCode


class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO


class NombreCorto(BadRequest):
    DETAIL = ErrorCode.NOMBRE_CORTO


class AbreviaturaVacia(BadRequest):
    DETAIL = ErrorCode.ABREVIATURA_VACIA


class AbreviaturaLarga(BadRequest):
    DETAIL = ErrorCode.ABREVIATURA_LARGA


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class AbreviaturaDuplicada(BadRequest):
    DETAIL = ErrorCode.ABREVIATURA_DUPLICADA


class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_NO_ENCONTRADA


class UnidadMedidaInactiva(BadRequest):
    DETAIL = ErrorCode.UNIDAD_INACTIVA


class UnidadMedidaEnUso(BadRequest):
    DETAIL = ErrorCode.UNIDAD_EN_USO
