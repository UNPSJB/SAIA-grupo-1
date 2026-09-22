REGEX_SOLO_LETRAS = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$"
REGEX_DNI = r"^\d{7,8}$"
REGEX_TELEFONO = r"^\+?\d{7,15}$"

ERROR_SOLO_LETRAS = "Solo se permiten letras y espacios."
ERROR_DNI_FORMATO = "El DNI debe contener 7 u 8 dígitos numéricos sin puntos."
ERROR_TELEFONO_FORMATO = "El teléfono debe contener entre 7 y 15 dígitos numéricos."
ERROR_EMAIL_INVALIDO = "Debe proporcionar un correo electrónico válido."