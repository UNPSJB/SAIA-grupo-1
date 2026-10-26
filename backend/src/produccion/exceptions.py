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


class CantidadInsumoInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INSUMO_INVALIDA


class InsumosRequeridos(BadRequest):
    DETAIL = ErrorCode.INSUMOS_REQUERIDOS


class InsumoRepetido(BadRequest):
    DETAIL = ErrorCode.INSUMO_REPETIDO


class InsumoYaAsociado(BadRequest):
    DETAIL = ErrorCode.INSUMO_YA_ASOCIADO


class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE


class InsumoNoAsociado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ASOCIADO


class UnidadProductoRequerida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_PRODUCTO_REQUERIDA


class UnidadDeProductoExistente(BadRequest):
    DETAIL = ErrorCode.UNIDAD_DE_PRODUCTO_EXISTENTE


class ProductoConOtraUnidad(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_CON_OTRA_UNIDAD


class LoteCerrado(BadRequest):
    DETAIL = ErrorCode.LOTE_CERRADO
