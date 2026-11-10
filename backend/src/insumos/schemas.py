from datetime import date, datetime, timedelta
from typing import List, Optional, Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.insumos import exceptions
from src.insumos.models import UnidadMedida


class InsumoBase(BaseModel):
    nombre: str
    lote: str
    fechaRecepcion: datetime
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: float
    stock: float
    medida: UnidadMedida
    tipo_insumo_id: Optional[int] = None
    proveedor_id: Optional[int] = None

    @field_validator("medida", mode="before")
    @classmethod
    def is_valid_medida_insumo(cls, v: str | UnidadMedida) -> UnidadMedida:
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
        if v.date() > date.today():
            raise exceptions.FechaRecepcionInvalida()
        return v

    @field_validator("fechaVencimiento")
    @classmethod
    def validar_fecha_vencimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            manana = (datetime.now() + timedelta(days=7)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
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
    def validar_relacion_stock_cantidad(self) -> Self:
        if self.stock > self.cantRecibida:
            raise exceptions.StockMayorCantidad()
        return self


class RecepcionInsumoRequest(BaseModel):
    tipo_insumo_id: int
    proveedor_id: int
    lote: str = Field(..., min_length=1, max_length=100)
    nombre: Optional[str] = Field(default=None, max_length=100)
    fechaRecepcion: Optional[date] = None
    fechaVencimiento: date
    cantRecibida: float = Field(..., gt=0)

    @field_validator("lote")
    @classmethod
    def validar_lote(cls, v: str) -> str:
        if not v or not v.strip():
            raise exceptions.LoteVacio()
        return v.strip()

    @field_validator("fechaRecepcion")
    @classmethod
    def validar_recepcion_solo_hoy(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v != date.today():
            raise exceptions.FechaRecepcionSoloHoy()
        return v

    @field_validator("cantRecibida")
    @classmethod
    def validar_cantidad(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.CantidadRecibidaInvalida()
        return v

    @model_validator(mode="after")
    def validar_vencimiento(self) -> Self:
        f_rec = self.fechaRecepcion or date.today()
        min_venc = f_rec + timedelta(days=7)
        if self.fechaVencimiento < min_venc:
            raise exceptions.FechaVencimientoPosterior()
        return self


class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    lote: Optional[str] = None
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: Optional[float] = None
    stock: Optional[float] = None
    medida: Optional[UnidadMedida] = None
    tipo_insumo_id: Optional[int] = None
    proveedor_id: Optional[int] = None

    @field_validator("medida", mode="before")
    @classmethod
    def is_valid_medida_insumo(cls, v: Optional[str | UnidadMedida]) -> Optional[UnidadMedida]:
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
    def validar_relacion_stock_cantidad_update(self) -> Self:
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
    activo: bool = True
    proveedor_nombre: Optional[str] = None
    tipo_insumo_nombre: Optional[str] = None
    estadoVencimiento: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InsumoSelectorItem(BaseModel):
    id: int
    nombre: str
    lote: str
    fechaVencimiento: Optional[date] = None
    fechaVencimientoFormateada: str
    stock: float
    medida: str
    estadoVencimiento: str
    proveedor: Optional[str] = None
    tipo_insumo_id: Optional[int] = None
    tipo_insumo_nombre: Optional[str] = None


class InsumoLoteItem(BaseModel):
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
    dias_para_vencer: Optional[int] = None
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class InsumoAgrupadoPorTipo(BaseModel):
    tipo_id: int
    nombre: str
    descripcion: Optional[str] = None
    unidadMedida: str
    stock_total: float
    tiene_vencidos: bool = False
    tiene_proximos: bool = False
    lotes: List[InsumoLoteItem] = []
    lotes_agotados: List[InsumoLoteItem] = []


class TrazabilidadLoteProduccion(BaseModel):
    lote_produccion_id: int
    lote_produccion_codigo: str
    producto_nombre: str
    fecha_produccion: date
    cantidad_usada: float
    unidad_medida: str
    responsable_nombre: str


class InsumoDetalleTrazabilidad(BaseModel):
    insumo: Insumo
    lotes_produccion: List[TrazabilidadLoteProduccion] = []
