from datetime import date, datetime
from typing import List, Optional, Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.insumos.models import UnidadMedida
from src.produccion import exceptions
from src.produccion.constants import NOMBRE_PRODUCTO_MAX


def normalizar_nombre_producto(nombre: str) -> str:
    """Quita espacios sobrantes (también los internos) y valida que no quede vacío ni largo de más."""
    nombre = " ".join((nombre or "").split())
    if not nombre:
        raise exceptions.NombreProductoVacio()
    if len(nombre) > NOMBRE_PRODUCTO_MAX:
        raise exceptions.NombreProductoDemasiadoLargo()
    return nombre


class Producto(BaseModel):
    id: int
    nombre: str
    unidad_medida: UnidadMedida
    model_config = ConfigDict(from_attributes=True)


class LoteProduccionCreate(BaseModel):
    producto_id: Optional[int] = None
    producto_nombre: Optional[str] = None
    # solo para un producto nuevo; uno existente ya tiene la suya
    producto_unidad_medida: Optional[UnidadMedida] = None
    fecha: date
    # en la unidad de medida del producto
    cantidad: float = Field(allow_inf_nan=False)

    @field_validator("producto_nombre")
    @classmethod
    def validar_nombre_producto(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else normalizar_nombre_producto(v)

    @field_validator("fecha")
    @classmethod
    def validar_fecha_no_futura(cls, v: date) -> date:
        if v > date.today():
            raise exceptions.FechaLoteInvalida()
        return v

    @field_validator("cantidad")
    @classmethod
    def validar_cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.CantidadInvalida()
        return v

    @model_validator(mode="after")
    def validar_producto(self) -> Self:
        if self.producto_id is None and self.producto_nombre is None:
            raise exceptions.ProductoRequerido()
        if self.producto_id is not None and self.producto_nombre is not None:
            raise exceptions.ProductoAmbiguo()
        if self.producto_nombre is not None and self.producto_unidad_medida is None:
            raise exceptions.UnidadProductoRequerida()
        if self.producto_id is not None and self.producto_unidad_medida is not None:
            raise exceptions.UnidadDeProductoExistente()
        return self


class InsumoLoteCreate(BaseModel):
    insumo_id: int
    # en la unidad de medida del insumo (si el insumo está en kilogramos, se cargan kilogramos)
    cantidad: float = Field(allow_inf_nan=False)

    @field_validator("cantidad")
    @classmethod
    def validar_cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.CantidadInsumoInvalida()
        return v


class AsociarInsumos(BaseModel):
    insumos: List[InsumoLoteCreate]

    @field_validator("insumos")
    @classmethod
    def validar_insumos(cls, v: List[InsumoLoteCreate]) -> List[InsumoLoteCreate]:
        if not v:
            raise exceptions.InsumosRequeridos()
        ids = [i.insumo_id for i in v]
        if len(ids) != len(set(ids)):
            raise exceptions.InsumoRepetido()
        return v


class InsumoResumen(BaseModel):
    id: int
    nombre: str
    lote: str
    medida: UnidadMedida
    model_config = ConfigDict(from_attributes=True)


class InsumoDisponible(InsumoResumen):
    stock: float
    fechaVencimiento: Optional[datetime]


class InsumoLote(BaseModel):
    insumo: InsumoResumen
    cantidad: float
    model_config = ConfigDict(from_attributes=True)


class LoteProduccion(BaseModel):
    id: int
    codigo: str
    producto: Producto
    fecha: date
    cantidad: float
    responsable_legajo: int
    nombre_responsable: str
    creado_en: datetime
    # False para los lotes de días anteriores: ya no se les pueden agregar ni quitar insumos
    editable: bool
    insumos: List[InsumoLote]
    model_config = ConfigDict(from_attributes=True)
