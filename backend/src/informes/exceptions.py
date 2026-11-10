from src.exceptions import BadRequest
from src.informes.constants import ErrorCode


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO
