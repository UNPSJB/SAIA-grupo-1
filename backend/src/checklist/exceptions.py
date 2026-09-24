from src.checklist.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class ChecklistNoEncontrado(NotFound):
    DETAIL = ErrorCode.CHECKLIST_NO_ENCONTRADO


class TareaChecklistNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_CHECKLIST_NO_ENCONTRADA


class TareaYaCompletada(BadRequest):
    DETAIL = ErrorCode.TAREA_YA_COMPLETADA


class ResponsableNoEncontrado(BadRequest):
    DETAIL = ErrorCode.RESPONSABLE_NO_ENCONTRADO


class ResponsableInactivo(BadRequest):
    DETAIL = ErrorCode.RESPONSABLE_INACTIVO


class ChecklistFechaFutura(BadRequest):
    DETAIL = ErrorCode.CHECKLIST_FECHA_FUTURA


class NoHayTareasCorrespondientes(BadRequest):
    DETAIL = ErrorCode.NO_HAY_TAREAS_CORRESPONDIENTES


class ImagenNoEncontrada(NotFound):
    DETAIL = ErrorCode.IMAGEN_NO_ENCONTRADA


class FormatoImagenInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_IMAGEN_INVALIDO


class ChecklistNoModificable(BadRequest):
    DETAIL = ErrorCode.CHECKLIST_NO_MODIFICABLE


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO

