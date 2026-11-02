from enum import StrEnum


class TipoNotificacion(StrEnum):
    VENCIMIENTO_PERSONAL = "vencimiento_personal"
    VENCIMIENTO_EQUIPO = "vencimiento_equipo"
    VENCIMIENTO_DOCUMENTO = "vencimiento_documento"
    VENCIMIENTO_ELEMENTO_LIMPIEZA = "vencimiento_elemento_limpieza"
    VENCIMIENTO_PLAGAS_AGUA = "vencimiento_plagas_agua"
    EVENTO_TAREA_REVISION = "evento_tarea_revision"
    EVENTO_TAREA_REASIGNADA = "evento_tarea_reasignada"
    EVENTO_STOCK_QUIMICO = "evento_stock_quimico"
    INCIDENTE_CRITICO = "incidente_critico"
    EVENTO_INCIDENTE = "evento_incidente"
    GENERAL = "general"

