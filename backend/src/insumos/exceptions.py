from typing import List
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class UnidadMedidaInvalida(ValueError):
    def __init__(self, posibles_unidades: List[str]):
        posibles_unidades = ", ".join(posibles_unidades)
        message = f"{ErrorCode.UNIDAD_MEDIDA_INVALIDA} {posibles_unidades}."
        super().__init__(message)