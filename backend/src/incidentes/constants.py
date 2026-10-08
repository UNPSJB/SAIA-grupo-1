from enum import StrEnum, auto

DESCRIPCION_MAX = 500
ACCION_CORRECTIVA_MAX = 1000
MOTIVO_REAPERTURA_MAX = 500
FOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

# Se valida por el contenido real del archivo (sus primeros bytes), no por lo que declare el cliente.
FIRMAS_IMAGEN = {
    b"\xff\xd8\xff": ".jpg",
    b"\x89PNG\r\n\x1a\n": ".png",
}


class EstadoIncidente(StrEnum):
    PENDIENTE = auto()
    EN_REVISION = auto()
    CERRADO = auto()
    RESUELTO = auto()  # mantenido para retrocompatibilidad con registros previos
    DESCARTADO = auto()
    REABIERTO = auto()


class ErrorCode:
    INCIDENTE_NO_ENCONTRADO = "El incidente no fue encontrado."
    DESCRIPCION_VACIA = "La descripción del incidente no puede estar vacía."
    DESCRIPCION_DEMASIADO_LARGA = f"La descripción no puede superar los {DESCRIPCION_MAX} caracteres."
    ACCION_CORRECTIVA_VACIA = "La descripción de la acción correctiva no puede estar vacía."
    ACCION_CORRECTIVA_DEMASIADO_LARGA = f"La acción correctiva no puede superar los {ACCION_CORRECTIVA_MAX} caracteres."
    MOTIVO_REAPERTURA_VACIO = "Debe indicar el motivo de reapertura del incidente."
    MOTIVO_REAPERTURA_DEMASIADO_LARGO = f"El motivo de reapertura no puede superar los {MOTIVO_REAPERTURA_MAX} caracteres."
    INCIDENTE_YA_CERRADO = "El incidente ya se encuentra cerrado."
    INCIDENTE_NO_CERRADO = "El incidente debe estar cerrado para poder ser reabierto."
    FORMATO_IMAGEN_INVALIDO = "La foto debe ser una imagen JPG o PNG válida."
    IMAGEN_DEMASIADO_GRANDE = f"La foto no puede superar los {FOTO_MAX_BYTES // (1024 * 1024)} MB."
    FOTO_NO_ENCONTRADA = "El incidente no tiene foto."
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."
