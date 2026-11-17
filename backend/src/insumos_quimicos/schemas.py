from datetime import datetime
from typing import Optional, Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from .constants import TipoQuimicoEnum

from src.dashboard.schemas import (
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
    unidad_medida_id: Optional[int] = None
    unidad_medida: Optional[str] = None
    stock_actual: float = Field(0.0, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre no puede estar vacío ni contener solo espacios.")
        return v.strip()

    @field_validator("proveedor")
    @classmethod
    def validar_proveedor(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_strip = v.strip()
            return v_strip if v_strip else None
        return None


class InsumoQuimicoCreate(InsumoQuimicoBase):
    stock_actual: float = Field(..., gt=0.0, description="Al dar de alta debe ser mayor a 0")

    @model_validator(mode="after")
    def validar_unidad_requerida(self) -> Self:
        if self.unidad_medida_id is None and (
            self.unidad_medida is None or not str(self.unidad_medida).strip()
        ):
            raise ValueError("La unidad de medida es obligatoria.")
        return self


class InsumoQuimicoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    tipo: Optional[TipoQuimicoEnum] = None
    unidad_medida_id: Optional[int] = None
    unidad_medida: Optional[str] = None
    stock_actual: Optional[float] = Field(None, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)
    activo: Optional[bool] = None


class InsumoQuimicoResponse(InsumoQuimicoBase):
    id: int
    unidad_medida_id: int
    unidad_medida: str
    unidad_medida_nombre: Optional[str] = None
    activo: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
