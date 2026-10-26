class DashboardException(Exception):
    """Excepción base para el módulo de dashboard."""
    pass


class RangoFechasInvalidoException(DashboardException):
    def __init__(self, mensaje: str = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."):
        super().__init__(mensaje)
