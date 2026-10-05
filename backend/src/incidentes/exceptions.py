from fastapi import status
from src.exceptions import BadRequest, DetailedHTTPException, NotFound, UnprocessableContent
from src.incidentes.constants import ErrorCode


class IncidenteNoEncontrado(NotFound):
    DETAIL = ErrorCode.INCIDENTE_NO_ENCONTRADO


class DescripcionVacia(UnprocessableContent):
    DETAIL = ErrorCode.DESCRIPCION_VACIA


class DescripcionDemasiadoLarga(UnprocessableContent):
    DETAIL = ErrorCode.DESCRIPCION_DEMASIADO_LARGA


class FormatoImagenInvalido(UnprocessableContent):
    DETAIL = ErrorCode.FORMATO_IMAGEN_INVALIDO


class ImagenDemasiadoGrande(DetailedHTTPException):
    STATUS_CODE = status.HTTP_413_CONTENT_TOO_LARGE
    DETAIL = ErrorCode.IMAGEN_DEMASIADO_GRANDE


class FotoNoEncontrada(NotFound):
    DETAIL = ErrorCode.FOTO_NO_ENCONTRADA


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO
