from src.checklist.exceptions import RangoFechasInvalido
from src.exceptions import BadRequest

class DashboardException(Exception):
    pass

class RangoFechasInvalidoException(RangoFechasInvalido):
    def __init__(self, mensaje: str = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."):
        super().__init__(detail=mensaje)

__all__ = ["RangoFechasInvalido", "DashboardException", "RangoFechasInvalidoException"]
