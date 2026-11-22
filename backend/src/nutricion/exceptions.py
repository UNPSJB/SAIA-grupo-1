from src.exceptions import BadRequest, NotFound
from src.nutricion.constants import ErrorCode


class NutricionException(BadRequest):
    pass


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class ProductoSinRecetaError(NotFound):
    DETAIL = ErrorCode.PRODUCTO_SIN_RECETA


class RecetaSinIngredientesError(BadRequest):
    DETAIL = ErrorCode.RECETA_SIN_INGREDIENTES


class RendimientoInvalidoError(BadRequest):
    DETAIL = ErrorCode.RENDIMIENTO_INVALIDO


class PorcionInvalidaError(BadRequest):
    DETAIL = ErrorCode.PORCION_INVALIDA


class ParametroInvalidoError(NotFound):
    def __init__(self, nutriente: str):
        super().__init__(detail=f"Parámetro no encontrado para el nutriente: {nutriente}")
