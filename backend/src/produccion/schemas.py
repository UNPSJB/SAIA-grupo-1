from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.insumos.models import UnidadMedida
from src.produccion import exceptions


class Producto(BaseModel):
    """Lo que el lote muestra del producto; el resto se consulta en /productos."""

    id: int
    nombre: str
    # todos los lotes del producto se miden en esta unidad
    unidadMedida: UnidadMedida
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class LoteProduccionCreate(BaseModel):
    # un producto activo dado de alta en el ABM de productos
    producto_id: int
    fecha: date
    # en la unidad de medida del producto
    cantidad: float = Field(allow_inf_nan=False)

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
