from src.producto.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO

class UnidadVacia(BadRequest):
    DETAIL = ErrorCode.UNIDAD_VACIA