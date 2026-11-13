from src.exceptions import BadRequest, Conflict, NotFound
from src.rotulado_frontal.constants import ErrorCode


class ConjuntoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CONJUNTO_NO_ENCONTRADO


class VersionDuplicada(Conflict):
    DETAIL = ErrorCode.VERSION_DUPLICADA


class ConjuntoPublicadoInmutable(Conflict):
    DETAIL = ErrorCode.CONJUNTO_PUBLICADO_INMUTABLE


class CalculoNoEncontrado(NotFound):
    DETAIL = ErrorCode.CALCULO_NO_ENCONTRADO


class CalculoInmutable(Conflict):
    DETAIL = ErrorCode.CALCULO_INMUTABLE


class ConjuntoSinReglas(BadRequest):
    DETAIL = ErrorCode.CONJUNTO_SIN_REGLAS


class FechaVigenciaNoPosterior(Conflict):
    DETAIL = ErrorCode.FECHA_VIGENCIA_NO_POSTERIOR


class SinParametrosVigentes(Conflict):
    DETAIL = ErrorCode.SIN_PARAMETROS_VIGENTES


class ModuloDesactivado(Conflict):
    DETAIL = ErrorCode.MODULO_DESACTIVADO


class EstadoFisicoIndeterminado(BadRequest):
    DETAIL = ErrorCode.ESTADO_FISICO_INDETERMINADO
