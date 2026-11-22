from enum import Enum


class ErrorCode:
    INSUMO_QUIMICO_NO_ENCONTRADO = "El insumo químico no fue encontrado."
    INSUMO_QUIMICO_NO_ENCONTRADO_ID = "El insumo químico con ID"
    INSUMO_QUIMICO_NOMBRE_DUPLICADO = "Ya existe un insumo químico registrado con el nombre"
    INSUMO_QUIMICO_STOCK_INVALIDO = "El stock no puede ser menor a cero."
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."

class TipoQuimicoEnum(str, Enum):
    DETERGENTE = "DETERGENTE"
    DESINFECTANTE = "DESINFECTANTE"
    DESENGRASANTE = "DESENGRASANTE"
    SANITIZANTE = "SANITIZANTE"
    OTRO = "OTRO"
