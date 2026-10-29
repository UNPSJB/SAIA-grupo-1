# Si dos operadores registran a la vez un lote del mismo dia pueden generar el mismo codigo;
# la restriccion UNIQUE lo frena y se reintenta con el siguiente numero.
INTENTOS_CODIGO_LOTE = 3


class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    PRODUCTO_INACTIVO = "El producto está dado de baja: no se le pueden registrar lotes."
    CANTIDAD_INVALIDA = "La cantidad producida debe ser mayor a cero."
    FECHA_LOTE_INVALIDA = "La fecha del lote no puede ser posterior a la fecha actual."
    LOTE_NO_ENCONTRADO = "El lote no fue encontrado."
    CODIGO_LOTE_NO_GENERADO = "No se pudo generar un código único para el lote. Intente nuevamente."
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."
    CANTIDAD_INSUMO_INVALIDA = "La cantidad utilizada de cada insumo debe ser mayor a cero."
    INSUMOS_REQUERIDOS = "Debe indicar al menos un insumo."
    INSUMO_REPETIDO = "No se puede indicar el mismo insumo más de una vez."
    INSUMO_YA_ASOCIADO = "El insumo ya está asociado a este lote."
    STOCK_INSUFICIENTE = "La cantidad utilizada supera el stock disponible del insumo."
    INSUMO_NO_ASOCIADO = "El insumo no está asociado a este lote."
    LOTE_CERRADO = "El lote está cerrado: solo se pueden modificar los lotes del día."
