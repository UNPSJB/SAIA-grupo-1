from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from src.insumos.models import UnidadMedida
from src.insumos import exceptions
from datetime import datetime


class InsumoBase(BaseModel):
    nombre: str
    lote: str
    fechaRecepcion: datetime
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: float
    stock: float
    medida: UnidadMedida

    @field_validator(
        "medida", mode="before"
    )
    @classmethod
    def is_valid_medida_insumo(cls, v: str) -> str:
        if isinstance(v, UnidadMedida):
            return v
        
        if isinstance(v, str):
            val_upper = v.upper()
            if val_upper in UnidadMedida.__members__:
                return UnidadMedida[val_upper]
                
        raise exceptions.UnidadMedidaInvalida(list(UnidadMedida))


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    lote: Optional[str] = None
    fechaRecepcion: Optional[datetime] = None
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: Optional[float] = None
    stock: Optional[float] = None
    medida: Optional[UnidadMedida] = None
    
class InsumoUpdateStock(BaseModel):
    stock: float


class Insumo(InsumoBase):
    id: int
    model_config = ConfigDict(from_attributes = True)


class InsumoDelete(BaseModel):
    id: int
