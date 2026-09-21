class ErrorCode:
    INSUMO_NO_ENCONTRADO = "El insumo no fue encontrado."
    NOMBRE_VACIO = "El nombre del insumo no puede estar vacío."
    UNIDAD_MEDIDA_INVALIDA = "La unidad de medida indicada es inválida. El valor indicado debiera ser una de las opciones en la lista:"
    FECHA_RECEPCION_INVALIDA = "La fecha de recepción no puede ser posterior a la fecha actual."
    FECHA_VENCIMIENTO_INVALIDA = "La fecha de vencimiento no puede ser anterior a dentro de 7 días."
    CANTIDAD_RECIBIDA_INVALIDA = "La cantidad recibida debe ser mayor a cero."
    STOCK_INVALIDO =   "El stock debe ser mayor o igual a cero."
    STOCK_MAYOR_CANTIDAD = "El stock no puede ser mayor a la cantidad recibida."