from src.categorias_incidentes.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class CategoriaNoEncontrada(NotFound):
    DETAIL = ErrorCode.CATEGORIA_NO_ENCONTRADA


class CategoriaNombreDuplicado(BadRequest):
    DETAIL = ErrorCode.CATEGORIA_NOMBRE_DUPLICADO


class CategoriaNombreVacio(BadRequest):
    DETAIL = ErrorCode.CATEGORIA_NOMBRE_VACIO


class CategoriaConIncidentes(BadRequest):
    DETAIL = ErrorCode.CATEGORIA_CON_INCIDENTES

