from src.producto.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO

class ProductoInactivo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO

class NombreProductoDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

class UnidadVacia(BadRequest):
    DETAIL = ErrorCode.UNIDAD_VACIA

class RecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.RECETA_NO_EXISTE

class DocumentoNoEsReceta(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_NO_ES_RECETA