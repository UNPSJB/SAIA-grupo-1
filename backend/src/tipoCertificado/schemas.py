from pydantic import BaseModel, Field, ConfigDict, field_validator
from src.tipoCertificado import exceptions

class TipoCertificadoBase(BaseModel):
    nombre: str = Field(max_length=30)

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise exceptions.NombreVacio()
        return v.strip()

class TipoCertificadoCreate(TipoCertificadoBase):
    pass

class TipoCertificado(TipoCertificadoBase):
    id: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)