from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from src.auditoria.models import AccionAuditoria
from src.auditoria import exceptions


class AuditoriaBase(BaseModel):
    tabla: str
    registro_id: int
    accion: AccionAuditoria
    campo: Optional[str] = None
    valor_previo: Optional[str] = None
    valor_posterior: Optional[str] = None

    @field_validator(
        "accion", mode="before"
    )
    @classmethod
    def is_valid_accion_auditoria(cls, v: str) -> AccionAuditoria:
        if isinstance(v, AccionAuditoria):
            return v

        if isinstance(v, str):
            val_upper = v.upper()
            if val_upper in AccionAuditoria.__members__:
                return AccionAuditoria[val_upper]

        raise exceptions.AccionAuditoriaInvalida(list(AccionAuditoria))


class AuditoriaCreate(AuditoriaBase):
    @field_validator("tabla")
    @classmethod
    def validar_tabla_no_vacia(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise exceptions.TablaAuditoriaVacia()
        return v


class Auditoria(AuditoriaBase):
    id: int
    creado_el: datetime
    model_config = ConfigDict(from_attributes=True)
