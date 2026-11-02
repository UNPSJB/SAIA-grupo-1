from src.exceptions import NotFound, PermissionDenied


class NotificacionNoEncontrada(NotFound):
    def __init__(self, mensaje: str = "La notificación no fue encontrada"):
        super().__init__(mensaje)


class NotificacionNoAutorizada(PermissionDenied):
    def __init__(self, mensaje: str = "No tienes permiso para acceder a esta notificación"):
        super().__init__(mensaje)

