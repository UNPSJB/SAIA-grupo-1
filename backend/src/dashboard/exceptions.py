from src.checklist.exceptions import RangoFechasInvalido

class DashboardException(Exception):
    pass

class RangoFechasInvalidoException(DashboardException):
    def __init__(self, mensaje: str = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."):
        super().__init__(mensaje)

__all__ = ["RangoFechasInvalido", "DashboardException", "RangoFechasInvalidoException"]
