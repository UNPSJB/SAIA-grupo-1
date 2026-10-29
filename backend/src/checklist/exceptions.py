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


class ChecklistFechaPasada(BadRequest):
    DETAIL = ErrorCode.CHECKLIST_FECHA_PASADA


class NoHayTareasCorrespondientes(BadRequest):
    DETAIL = ErrorCode.NO_HAY_TAREAS_CORRESPONDIENTES


class ChecklistYaGenerado(BadRequest):
    DETAIL = ErrorCode.CHECKLIST_YA_GENERADO


class ImagenNoEncontrada(NotFound):
    DETAIL = ErrorCode.IMAGEN_NO_ENCONTRADA


class FormatoImagenInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_IMAGEN_INVALIDO


class ChecklistNoModificable(BadRequest):
    DETAIL = ErrorCode.CHECKLIST_NO_MODIFICABLE


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO


class InsumoQuimicoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_QUIMICO_INACTIVO


class InsumoQuimicoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_QUIMICO_NO_ENCONTRADO


class CantidadConsumoInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_CONSUMO_INVALIDA


class MotivoNoRealizadoRequerido(BadRequest):
    DETAIL = ErrorCode.MOTIVO_NO_REALIZADO_REQUERIDO


class ObservacionObligatoriaParaOtro(BadRequest):
    DETAIL = ErrorCode.OBSERVACION_OBLIGATORIA_OTRO


class MotivoInvalido(BadRequest):
    DETAIL = ErrorCode.MOTIVO_INVALIDO


class TareaYaJustificada(BadRequest):
    DETAIL = ErrorCode.TAREA_YA_JUSTIFICADA


class TareaNoReasignablePorEstado(BadRequest):
    DETAIL = ErrorCode.TAREA_NO_REASIGNABLE_ESTADO


class TareaVencidaNoReasignable(BadRequest):
    DETAIL = ErrorCode.TAREA_VENCIDA_NO_REASIGNABLE


class ReasignarMismoOperadorSoloNoRealizada(BadRequest):
    DETAIL = ErrorCode.REASIGNAR_MISMO_OPERADOR_SOLO_NO_REALIZADA


class OperadorDestinoSinChecklistPendiente(BadRequest):
    DETAIL = ErrorCode.OPERADOR_DESTINO_SIN_CHECKLIST_PENDIENTE


class OperadorDestinoNoOperador(BadRequest):
    DETAIL = ErrorCode.OPERADOR_DESTINO_NO_OPERADOR


class TareaVenceHoyRequiereChecklistPendiente(OperadorDestinoSinChecklistPendiente):
    DETAIL = ErrorCode.TAREA_VENCE_HOY_SIN_CHECKLIST
