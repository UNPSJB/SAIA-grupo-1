from src.exceptions import BadRequest, NotFound
from src.rotulado.constants import ErrorCode


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class ListaIngredientesNoEncontrada(NotFound):
    DETAIL = ErrorCode.LISTA_NO_ENCONTRADA


class PorcentajeInvalido(BadRequest):
    DETAIL = ErrorCode.PORCENTAJE_INVALIDO


class ListaVacia(BadRequest):
    DETAIL = ErrorCode.LISTA_VACIA


class DatosIncompletosAditivo(BadRequest):
    DETAIL = ErrorCode.DATOS_INCOMPLETOS_ADITIVO


class ItemsReordenarInvalidos(BadRequest):
    DETAIL = ErrorCode.ITEMS_REORDENAR_INVALIDOS


class FormatoInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_INVALIDO


class SinLotesDisponibles(BadRequest):
    DETAIL = ErrorCode.SIN_LOTES_DISPONIBLES


class BorradorNoEncontrado(NotFound):
    DETAIL = ErrorCode.BORRADOR_NO_ENCONTRADO


class ExportacionSinLeyendaError(BadRequest):
    DETAIL = ErrorCode.EXPORTACION_SIN_LEYENDA


