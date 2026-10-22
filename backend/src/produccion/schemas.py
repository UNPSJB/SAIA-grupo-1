from datetime import date, datetime
from typing import Optional, Self
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
    model_config = ConfigDict(from_attributes=True)


class LoteProduccionCreate(BaseModel):
    producto_id: Optional[int] = None
    producto_nombre: Optional[str] = None
    fecha: date
    cantidad: float = Field(allow_inf_nan=False)
    unidad_medida: UnidadMedida

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
        return self


class LoteProduccion(BaseModel):
    id: int
    codigo: str
    producto: Producto
    fecha: date
    cantidad: float
    unidad_medida: UnidadMedida
    responsable_legajo: int
    nombre_responsable: str
    creado_en: datetime
    model_config = ConfigDict(from_attributes=True)
