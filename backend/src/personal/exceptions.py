from src.personal.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class PersonalNoEncontrado(NotFound):
    DETAIL = ErrorCode.PERSONAL_NO_ENCONTRADO


class EmailDuplicado(BadRequest):
    DETAIL = ErrorCode.EMAIL_DUPLICADO
