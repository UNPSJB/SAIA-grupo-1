from src.exceptions import BadRequest, NotFound
from src.produccion.constants import ErrorCode


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class ProductoRequerido(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_REQUERIDO


class ProductoAmbiguo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_AMBIGUO


class NombreProductoVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_PRODUCTO_VACIO


class NombreProductoDemasiadoLargo(BadRequest):
    DETAIL = ErrorCode.NOMBRE_PRODUCTO_DEMASIADO_LARGO


class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA


class FechaLoteInvalida(BadRequest):
    DETAIL = ErrorCode.FECHA_LOTE_INVALIDA


class LoteNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_NO_ENCONTRADO


class CodigoLoteNoGenerado(BadRequest):
    DETAIL = ErrorCode.CODIGO_LOTE_NO_GENERADO


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO
