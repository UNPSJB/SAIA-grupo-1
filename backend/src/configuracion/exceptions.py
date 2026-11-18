from src.configuracion.constants import ErrorCode
from src.exceptions import NotFound


class VistaPublicaNoHabilitada(NotFound):
    DETAIL = ErrorCode.VISTA_PUBLICA_NO_HABILITADA
