from src.recetas.constants import ErrorCode
from src.exceptions import NotFound, BadRequest

class RecetaNoEncontrada(NotFound):
    DETAIL=ErrorCode.RECETA_NO_ENCONTRADA

class SeNecesitaRendimiento(BadRequest):
    DETAIL=ErrorCode.SE_NECESITA_RENDIMIENTO

class AditivoClaseFuncional(BadRequest):
    DETAIL=ErrorCode.ADITIVO_CLASE_FUNCIONAL

class CantidadInvalida(BadRequest):
    DETAIL=ErrorCode.CANTIDAD

class AgregueIngredientes(BadRequest):
    DETAIL=ErrorCode.AGREGUE_INGREDIENTES

class ResponsableInactivo(BadRequest):
    DETAIL="EL RESPONSABLE DE LA RECETA ESTÁ INACTIVO"

class SoloAdministradorPuedeSubir(BadRequest):
    DETAIL="SOLO UN ADMINISTRADOR PUEDE SUBIR UNA RECETA"

class UsuarioNoEncontrado(BadRequest):
    DETAIL="USUARIO NO ENCONTRADO"

class UsuarioInactivo(BadRequest):
    DETAIL="USUARIO INACTIVO"

class AditivoNumeroINS(BadRequest):
    DETAIL=ErrorCode.ADITIVO_INS

class NombreInvalido(BadRequest):
    DETAIL=ErrorCode.NOMBRE_INVALIDO

class UnidadMedidaVacia(BadRequest):
    DETAIL=ErrorCode.UNIDAD_MEDIDA_VACIA
    
class FechaAnterior(BadRequest):
    DETAIL=ErrorCode.FECHA_INVALIDA

class ResponsableNoEncontrado(BadRequest):
    DETAIL="RESPONSABLE NO ENCONTRADO"

class DescripcionVacia(BadRequest):
    DETAIL=ErrorCode.DESCRIPCION_VACIA

class NombreVacio(BadRequest):
    DETAIL=ErrorCode.NOMBRE_VACIO

class ChecklistNoEncontrado(NotFound):
    DETAIL=ErrorCode.CHECKLIST_NO_ENCONTRADO

class EtapaChecklistNoEncontrada(NotFound):
    DETAIL=ErrorCode.ETAPA_CHECKLIST_NO_ENCONTRADA

class EtapaYaCompletada(BadRequest):
    DETAIL=ErrorCode.ETAPA_YA_COMPLETADA

class ChecklistFechaInvalida(BadRequest):
    DETAIL=ErrorCode.CHECKLIST_FECHA_INVALIDA

class NoHayEtapasAsignadas(BadRequest):
    DETAIL=ErrorCode.NO_HAY_ETAPAS_ASIGNADAS

class ChecklistYaGenerado(BadRequest):
    DETAIL=ErrorCode.CHECKLIST_YA_GENERADO

class ChecklistNoModificable(BadRequest):
    DETAIL=ErrorCode.CHECKLIST_NO_MODIFICABLE

class PersonalNoOperador(BadRequest):
    DETAIL=ErrorCode.PERSONAL_NO_OPERADOR

