from src.dashboard.exceptions import RangoFechasInvalidoException  # noqa: F401
from src.exceptions import BadRequest, NotFound
from src.insumos_quimicos.constants import ErrorCode

class InsumoQuimicoException(Exception):
    pass


class InsumoQuimicoError(BadRequest):
    def __init__(self, mensaje: str) -> None:
        super().__init__(detail=mensaje or ErrorCode.INSUMO_QUIMICO_NO_ENCONTRADO)


class RangoFechasInvalido(BadRequest):
    def __init__(self, mensaje: str) -> None:
        super().__init__(detail=mensaje or ErrorCode.RANGO_FECHAS_INVALIDO)

class InsumoQuimicoNotFoundException(NotFound):
    def __init__(self, insumo_id: int):
        super().__init__(
            detail=f"{ErrorCode.INSUMO_QUIMICO_NO_ENCONTRADO_ID} {insumo_id} no fue encontrado."
        )

class InsumoQuimicoDuplicateNameException(BadRequest):
    def __init__(self, nombre: str):
        super().__init__(
            detail=f"{ErrorCode.INSUMO_QUIMICO_NOMBRE_DUPLICADO} '{nombre}'."
        )

class InsumoQuimicoInvalidStockException(BadRequest):
    def __init__(self):
        super().__init__(detail=ErrorCode.INSUMO_QUIMICO_STOCK_INVALIDO)
