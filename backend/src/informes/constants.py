from src.checklist.models import EstadoTareaItem, MotivoNoRealizado
from src.incidentes.constants import EstadoIncidente

# Cuentan para el porcentaje de cumplimiento. REASIGNADO queda afuera porque la tarea se evalúa
# en el ítem que la reemplaza, y PENDIENTE porque todavía está en plazo.
ESTADOS_CUMPLIDOS = (EstadoTareaItem.REALIZADO,)
ESTADOS_INCUMPLIDOS = (EstadoTareaItem.NO_REALIZADO, EstadoTareaItem.VENCIDO)

# RESUELTO es el estado de cierre de los registros previos a la HDU #39
ESTADOS_INCIDENTE_CERRADO = (EstadoIncidente.CERRADO, EstadoIncidente.RESUELTO)

ETIQUETAS_MOTIVO = {
    MotivoNoRealizado.EQUIPO_FUERA_DE_USO.value: "Equipo fuera de uso",
    MotivoNoRealizado.FALTA_DE_INSUMO.value: "Falta de insumo",
    MotivoNoRealizado.OTRO.value: "Otro",
}

ETIQUETAS_ESTADO_TAREA = {
    EstadoTareaItem.PENDIENTE: "Pendiente",
    EstadoTareaItem.REALIZADO: "Realizada",
    EstadoTareaItem.NO_REALIZADO: "No realizada",
    EstadoTareaItem.VENCIDO: "Vencida",
    EstadoTareaItem.REASIGNADO: "Reasignada",
}


class ErrorCode:
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."
