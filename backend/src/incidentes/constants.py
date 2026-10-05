from enum import StrEnum, auto

DESCRIPCION_MAX = 500
FOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

# Se valida por el contenido real del archivo (sus primeros bytes), no por lo que declare el cliente.
FIRMAS_IMAGEN = {
    b"\xff\xd8\xff": ".jpg",
    b"\x89PNG\r\n\x1a\n": ".png",
}


class EstadoIncidente(StrEnum):
    PENDIENTE = auto()
    EN_REVISION = auto()
    RESUELTO = auto()
    DESCARTADO = auto()
    REABIERTO = auto()


class ErrorCode:
    INCIDENTE_NO_ENCONTRADO = "El incidente no fue encontrado."
    DESCRIPCION_VACIA = "La descripción del incidente no puede estar vacía."
    DESCRIPCION_DEMASIADO_LARGA = f"La descripción no puede superar los {DESCRIPCION_MAX} caracteres."
    FORMATO_IMAGEN_INVALIDO = "La foto debe ser una imagen JPG o PNG válida."
    IMAGEN_DEMASIADO_GRANDE = f"La foto no puede superar los {FOTO_MAX_BYTES // (1024 * 1024)} MB."
    FOTO_NO_ENCONTRADA = "El incidente no tiene foto."
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."
