from src.personal.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class PersonalNoEncontrado(NotFound):
    DETAIL = ErrorCode.PERSONAL_NO_ENCONTRADO


class EmailDuplicado(BadRequest):
    DETAIL = ErrorCode.EMAIL_DUPLICADO


class DocumentoDuplicado(BadRequest):
    DETAIL = ErrorCode.DOCUMENTO_DUPLICADO

    def __init__(self, documento: str, actualizar: bool = False) -> None:
        plantilla = (
            ErrorCode.DOCUMENTO_DUPLICADO_ACTUALIZAR
            if actualizar
            else ErrorCode.DOCUMENTO_DUPLICADO_CREAR
        )
        super().__init__(detail=f"{plantilla} {documento}.")


class EmailDuplicadoPersonal(BadRequest):
    def __init__(self, email: str, actualizar: bool = False) -> None:
        if actualizar:
            super().__init__(detail=f"{ErrorCode.EMAIL_DUPLICADO_ACTUALIZAR} {email}")
        else:
            super().__init__(detail=f"{ErrorCode.EMAIL_DUPLICADO_CREAR} {email}")


class DuplicidadPersonal(BadRequest):
    DETAIL = ErrorCode.DUPLICIDAD_PERSONAL


class ConflictoPersonal(BadRequest):
    DETAIL = ErrorCode.CONFLICTO_PERSONAL
