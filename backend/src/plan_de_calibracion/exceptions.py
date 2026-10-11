from src.exceptions import BadRequest
from src.plan_de_calibracion.constants import ErrorCode


class NombreVacio(BadRequest):
    DETAIL=ErrorCode.NOMBRE_VACIO

class NombreInvalido(BadRequest):
    DETAIL=ErrorCode.NOMBRE_ERROR

class FechaVacia(BadRequest):
    DETAIL=ErrorCode.FECHA_ERROR

class FechaAnterior(BadRequest):
    DETAIL=ErrorCode.FECHA_ANTERIOR

class PeriodicidadInvalida(BadRequest):
    DETAIL=ErrorCode.PERIODICIDAD_ERROR

class PlanNoEncontrado(BadRequest):
    DETAIL=ErrorCode.NOSE_ENCONTRO_PLAN

class DescripcionVacia(BadRequest):
    DETAIL=ErrorCode.DESCRIPCION_VACIA