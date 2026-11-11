from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.unidadesMedida import exceptions


class UnidadMedidaBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    abreviatura: str = Field(..., max_length=15)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("abreviatura")
    @classmethod
    def validar_abreviatura(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.AbreviaturaVacia()
        limpio = "".join(v.strip().split()).upper()
        if len(limpio) > 15:
            raise exceptions.AbreviaturaLarga()
        return limpio


class UnidadMedidaCreate(UnidadMedidaBase):
    pass


class UnidadMedidaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=50)
    abreviatura: Optional[str] = Field(default=None, max_length=15)
    activo: Optional[bool] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("abreviatura")
    @classmethod
    def validar_abreviatura(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise exceptions.AbreviaturaVacia()
        limpio = "".join(v.strip().split()).upper()
        if len(limpio) > 15:
            raise exceptions.AbreviaturaLarga()
        return limpio


class UnidadMedidaResponse(BaseModel):
    id: int
    nombre: str
    abreviatura: str
    activo: bool
    total_referencias: int = 0

    model_config = ConfigDict(from_attributes=True)
