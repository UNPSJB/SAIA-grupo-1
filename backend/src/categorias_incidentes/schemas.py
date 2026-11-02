from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.categorias_incidentes import exceptions


class CategoriaIncidenteBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=255)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise exceptions.CategoriaNombreVacio()
        return limpio


class CategoriaIncidenteCreate(CategoriaIncidenteBase):
    pass


class CategoriaIncidenteUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=255)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        if not limpio:
            raise exceptions.CategoriaNombreVacio()
        return limpio


class CategoriaIncidente(CategoriaIncidenteBase):
    id: int
    total_incidentes: int = 0

    model_config = ConfigDict(from_attributes=True)

