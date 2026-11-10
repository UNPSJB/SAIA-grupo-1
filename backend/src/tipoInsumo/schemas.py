from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.insumos.models import UnidadMedida
from src.tipoInsumo import exceptions


class TipoInsumoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unidadMedida: UnidadMedida = Field(default=UnidadMedida.KILOGRAMOS)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class TipoInsumoCreate(TipoInsumoBase):
    pass


class TipoInsumoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unidadMedida: Optional[UnidadMedida] = None
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

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class LoteInsumoHistorico(BaseModel):
    id: int
    lote: str
    nombre: str
    stock: float
    cantRecibida: float
    medida: str
    fechaRecepcion: datetime | date
    fechaVencimiento: Optional[datetime | date] = None
    proveedor_id: Optional[int] = None
    proveedor_nombre: Optional[str] = None
    estadoVencimiento: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class TipoInsumo(TipoInsumoBase):
    id: int
    activo: bool = True
    total_lotes: int = 0
    stock_total: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class TipoInsumoDetalle(TipoInsumo):
    lotes: List[LoteInsumoHistorico] = []
