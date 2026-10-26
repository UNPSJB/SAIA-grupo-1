from pydantic import BaseModel, Field, ConfigDict, field_validator
from src.motivoNoRealizado import exceptions

class MotivoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise exceptions.NombreVacio()
        return v.strip()

class MotivoCreate(BaseModel):
    nombre: str = Field(..., max_length=100)

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise exceptions.NombreVacio()
        return v.strip()

class MotivoCambiarEstado(BaseModel):
    activo: bool

class Motivo(MotivoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
