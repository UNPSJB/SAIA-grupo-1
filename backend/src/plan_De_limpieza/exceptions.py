from src.plan_De_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreConNumeros(BadRequest):
    DETAIL=ErrorCode.NOMBRE_CON_NUMEROS

class NombreError(BadRequest):
    DETAIL=ErrorCode.NOMBRE_ERROR

class PlanNoEncontrado(BadRequest):
    DETAIL=ErrorCode.PLAN_ENCONTRADO