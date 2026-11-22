from src.exceptions import BadRequest, NotFound
from src.utils.constanst import ErrorCode


class Vacio(BadRequest):
    DETAIL=ErrorCode.VACIO


class NoPermitido(BadRequest):
    DETAIL=ErrorCode.NO_PERMITIDO

class NoPermitodMB(BadRequest):
    DETAIL=ErrorCode.NO_PERMITIDOMB


class LogoNoEncontrado(NotFound):
    DETAIL=ErrorCode.LOGO_NO_ENCONTRADO