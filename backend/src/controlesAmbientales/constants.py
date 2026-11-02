class ErrorCode:
    CONTROL_NO_ENCONTRADO = "Control ambiental no encontrado"
    VISITA_NO_ENCONTRADA = "Visita de control ambiental no encontrada"
    CONTROL_YA_EXISTE = "Ya existe un control registrado para este tipo"
    PERIOCIDAD_INVALIDA = "La periodicidad debe ser un número entero mayor a cero"
    CERTIFICADO_INVALIDO = "El certificado debe ser un archivo PDF o una imagen (.png, .jpg, .jpeg, .webp)"
    ARCHIVO_VACIO = "El archivo cargado está vacío"
    FECHA_REQUERIDA = "La fecha de realización del control es obligatoria"
    CONTROL_EXISTE_INACTIVO = "Este tipo de control ya existe pero está inactivo. Debes reactivarlo desde el filtro de inactivos."