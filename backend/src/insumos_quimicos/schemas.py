from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .constants import TipoQuimicoEnum, UnidadMedidaEnum

from src.dashboard.schemas import (  # noqa: F401
    AgrupacionTiempo,
    MovimientoInsumoQuimico,
    PuntoEvolucionConsumo,
    ConsumoAgrupadoItem,
    MetricasConsumoHistorico,
    ConsumoHistoricoResponse,
)

class InsumoQuimicoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    tipo: TipoQuimicoEnum
    unidad_medida: UnidadMedidaEnum
    stock_actual: float = Field(0.0, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre no puede estar vacío ni contener solo espacios.")
        return v.strip()

    @field_validator('proveedor')
    @classmethod
    def validar_proveedor(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_strip = v.strip()
            return v_strip if v_strip else None
        return None

class InsumoQuimicoCreate(InsumoQuimicoBase):
    stock_actual: float = Field(..., gt=0.0, description="Al dar de alta debe ser mayor a 0")

class InsumoQuimicoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    tipo: Optional[TipoQuimicoEnum] = None
    unidad_medida: Optional[UnidadMedidaEnum] = None
    stock_actual: Optional[float] = Field(None, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)
    activo: Optional[bool] = None

class InsumoQuimicoResponse(InsumoQuimicoBase):
    id: int
    activo: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
