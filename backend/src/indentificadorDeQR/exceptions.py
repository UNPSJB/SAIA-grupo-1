from src.indentificadorDeQR.constants import ErrorCode
from src.exceptions import NotFound, BadRequest



class CodigoQRInHabilitado(BadRequest):
    DETAIL=ErrorCode.QR_INHABILITADO