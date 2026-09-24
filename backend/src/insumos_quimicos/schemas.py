from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from .constants import TipoQuimicoEnum, UnidadMedidaEnum

# Esquema base general (permite >= 0 para lectura y existencia histórica)
class InsumoQuimicoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    tipo: TipoQuimicoEnum
    unidad_medida: UnidadMedidaEnum
    stock_actual: float = Field(0.0, ge=0.0)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre no puede estar vacío ni contener solo espacios.")
        return v.strip()

# Solo al CREAR se exige estrictamente mayor a 0
class InsumoQuimicoCreate(InsumoQuimicoBase):
    stock_actual: float = Field(..., gt=0.0, description="Al dar de alta debe ser mayor a 0")

class InsumoQuimicoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    tipo: Optional[TipoQuimicoEnum] = None
    unidad_medida: Optional[UnidadMedidaEnum] = None
    stock_actual: Optional[float] = Field(None, ge=0.0)
    activo: Optional[bool] = None

class InsumoQuimicoResponse(InsumoQuimicoBase):
    id: int
    activo: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True