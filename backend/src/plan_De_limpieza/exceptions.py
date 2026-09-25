from src.plan_De_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class NombreCaracteresRaros(BadRequest):
    DETAIL=ErrorCode.NOMBRE_CON_CARACTERES_RAROS

class NombreError(BadRequest):
    DETAIL=ErrorCode.NOMBRE_ERROR

class PlanNoEncontrado(BadRequest):
    DETAIL=ErrorCode.PLAN_ENCONTRADO
class FechaCreacionInvalida(BadRequest):
    DETAIL=ErrorCode.FECHA_CREACION_INVALIDA