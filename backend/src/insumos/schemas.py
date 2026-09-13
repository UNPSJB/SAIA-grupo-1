from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional
from src.insumos.models import UnidadMedida
from src.insumos import exceptions
from datetime import datetime, timedelta


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
    @field_validator("fechaRecepcion")
    @classmethod
    def validar_fecha_recepcion(cls, v: datetime) -> datetime:
        if v > datetime.now():
            raise exceptions.FechaRecepcionInvalida()
        return v

    @field_validator("fechaVencimiento")
    @classmethod
    def validar_fecha_vencimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            manana = (datetime.now() + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            if v < manana:
                raise exceptions.FechaVencimientoInvalida()
        return v

    @field_validator("cantRecibida")
    @classmethod
    def validar_mayores_a_cero(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.CantidadRecibidaInvalida()
        return v

    @field_validator("stock")
    @classmethod
    def validar_menor_a_cero(cls, v: float) -> float:
        if v < 0:
            raise exceptions.StockInvalido()
        return v
        

    @model_validator(mode="after")
    def validar_relacion_stock_cantidad(self) -> "InsumoBase":
        if self.stock > self.cantRecibida:
            raise exceptions.StockMayorCantidad()
        return self


class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    lote: Optional[str] = None
    fechaRecepcion: Optional[datetime] = None
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: Optional[float] = None
    stock: Optional[float] = None
    medida: Optional[UnidadMedida] = None

    @field_validator(
        "medida", mode="before"
    )
    @classmethod
    def is_valid_medida_insumo(cls, v: Optional[str]) -> Optional[UnidadMedida]:
        if v is None:
            return None
        if isinstance(v, UnidadMedida):
            return v
        if isinstance(v, str):
            val_upper = v.upper()
            if val_upper in UnidadMedida.__members__:
                return UnidadMedida[val_upper]
        raise exceptions.UnidadMedidaInvalida(list(UnidadMedida))

    @field_validator("cantRecibida")
    @classmethod
    def validar_mayores_a_cero(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise exceptions.CantidadRecibidaInvalida()
        return v
        
    @field_validator("stock")
    @classmethod
    def validar_menor_a_cero(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise exceptions.StockInvalido()
        return v

    @model_validator(mode="after")
    def validar_relacion_stock_cantidad_update(self) -> "InsumoUpdate":
        if self.stock is not None and self.cantRecibida is not None:
            if self.stock > self.cantRecibida:
                raise exceptions.StockMayorCantidad()
        return self
    
    
class InsumoUpdateStock(BaseModel):
    stock: float

    @field_validator("stock")
    @classmethod
    def validar_stock_mayor_a_cero(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.StockInvalido()
        return v

class Insumo(InsumoBase):
    id: int
    model_config = ConfigDict(from_attributes = True)


class InsumoDelete(BaseModel):
    id: int
