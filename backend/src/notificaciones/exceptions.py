from typing import Optional
from src.exceptions import NotFound, PermissionDenied


class NotificacionNoEncontrada(NotFound):
    DETAIL = "La notificación no fue encontrada"

    def __init__(self, mensaje: Optional[str] = None):
        if mensaje:
            self.DETAIL = mensaje
        super().__init__()


class NotificacionNoAutorizada(PermissionDenied):
    DETAIL = "No tienes permiso para acceder a esta notificación"

    def __init__(self, mensaje: Optional[str] = None):
        if mensaje:
            self.DETAIL = mensaje
        super().__init__()
