UNIDADES_MEDIDA_BASE = (
    {"nombre": "Kilogramos", "abreviatura": "KG"},
    {"nombre": "Gramos", "abreviatura": "G"},
    {"nombre": "Litros", "abreviatura": "L"},
    {"nombre": "Mililitros", "abreviatura": "ML"},
    {"nombre": "Unidades", "abreviatura": "UN"},
)


class ErrorCode:
    NOMBRE_VACIO = "El nombre de la unidad de medida no puede estar vacío"
    NOMBRE_CORTO = "El nombre de la unidad de medida debe tener al menos 2 caracteres"
    ABREVIATURA_VACIA = "La abreviatura de la unidad de medida no puede estar vacía"
    ABREVIATURA_LARGA = "La abreviatura no puede superar los 15 caracteres"
    NOMBRE_DUPLICADO = "Ya existe una unidad de medida con ese nombre"
    ABREVIATURA_DUPLICADA = "Ya existe una unidad de medida con esa abreviatura"
    UNIDAD_NO_ENCONTRADA = "Unidad de medida no encontrada"
    UNIDAD_INACTIVA = "La unidad de medida seleccionada está inactiva"
    UNIDAD_EN_USO = "No se puede eliminar la unidad de medida porque está asociada a registros existentes"
