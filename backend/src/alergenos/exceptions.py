from src.alergenos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class Nombre_Vacio(BadRequest):
    DETAIL=ErrorCode.NOMBRE_VACION

class Imagen_Vacia(BadRequest):
    DETAIL=ErrorCode.IMAGEN_VACIA

class Alergenos_cero(BadRequest):
    DETAIL=ErrorCode.NO_HAY_ALERGENOS

class Nombre_Duplicado(BadRequest):
    DETAIL= ErrorCode.Nombre_DUPLICADO