class ErrorCode:
    PERSONAL_NO_ENCONTRADO = "No se encontró el personal solicitado."
    EMAIL_DUPLICADO = "El correo electrónico ya se encuentra registrado."
    DOCUMENTO_DUPLICADO = "El número de documento (DNI) ya se encuentra registrado."
    DOCUMENTO_DUPLICADO_CREAR = "Ya existe una persona registrada con el DNI"
    EMAIL_DUPLICADO_CREAR = "El correo electrónico ya está registrado:"
    DOCUMENTO_DUPLICADO_ACTUALIZAR = "Ya existe otra persona registrada con el DNI"
    EMAIL_DUPLICADO_ACTUALIZAR = "El correo electrónico ya está en uso:"
    DUPLICIDAD_PERSONAL = "Error de duplicidad: el DNI o el correo electrónico ya existen en la base de datos."
    CONFLICTO_PERSONAL = "Conflicto de datos: DNI o correo duplicado."
    
REGEX_SOLO_LETRAS = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$"
REGEX_DNI = r"^\d{7,8}$"
REGEX_TELEFONO = r"^\+?\d{7,15}$"

ERROR_SOLO_LETRAS = "Solo se permiten letras y espacios."
ERROR_DNI_FORMATO = "El DNI debe contener 7 u 8 dígitos numéricos sin puntos."
ERROR_TELEFONO_FORMATO = "El teléfono debe contener entre 7 y 15 dígitos numéricos."
ERROR_EMAIL_INVALIDO = "Debe proporcionar un correo electrónico válido."