from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.sectores import exceptions

class SectorBase(BaseModel):
    nombre: str = Field(max_length=50)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.NombreInvalido()
        v_limpio = v.strip()
        if len(v_limpio) < 2:
            raise exceptions.NombreCorto()
        return v_limpio

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_limpio = v.strip()
        if not v_limpio:
            raise exceptions.NombreInvalido()
        if len(v_limpio) < 2:
            raise exceptions.NombreCorto()
        return v_limpio

class Sector(SectorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

