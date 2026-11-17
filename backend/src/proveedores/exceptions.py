from src.exceptions import BadRequest, NotFound
from src.proveedores.constants import ErrorCode


class NombreVacio(BadRequest):
    DETAIL = ErrorCode.NOMBRE_VACIO


class NombreCorto(BadRequest):
    DETAIL = ErrorCode.NOMBRE_CORTO


class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class ProveedorNoEncontrado(NotFound):
    DETAIL = ErrorCode.PROVEEDOR_NO_ENCONTRADO


class ProveedorEnUso(BadRequest):
    DETAIL = ErrorCode.PROVEEDOR_EN_USO
