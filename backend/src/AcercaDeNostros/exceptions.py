from src.AcercaDeNostros.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class Descripcion_vacia(BadRequest):
    DETAIL=ErrorCode.DESCRIPCION_VACIA