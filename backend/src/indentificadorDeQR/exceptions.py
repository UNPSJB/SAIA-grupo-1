from src.indentificadorDeQR.constants import ErrorCode
from src.exceptions import NotFound, BadRequest



class CodigoQRInHabilitado(BadRequest):
    DETAIL=ErrorCode.QR_INHABILITADO


class CodigoQRNoEncontrado(NotFound):
    DETAIL=ErrorCode.CODIGO_QR_NO_EXISTE


class SnapshotPublicoNoDisponible(NotFound):
    DETAIL=ErrorCode.SNAPSHOT_PUBLICO_NO_DISPONIBLE