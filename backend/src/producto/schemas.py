from typing import Optional, Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.producto import exceptions


class ProductoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    descripcion: Optional[str] = Field(default=None, min_length=1, max_length=100)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    id_receta: Optional[int] = None


class ProductoCreate(ProductoBase):
    @field_validator('nombre')
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        v_limpio = ' '.join(v.split())
        if not v_limpio:
            raise exceptions.NombreVacio
        return v_limpio

    @model_validator(mode="after")
    def validar_unidad_medida_obligatoria(self) -> Self:
        if self.unidad_medida_id is None and (
            self.unidadMedida is None or not str(self.unidadMedida).strip()
        ):
            raise exceptions.UnidadVacia
        return self


class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    id_receta: Optional[int] = None

    @field_validator('nombre')
    @classmethod
    def validar_nombre_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_limpio = ' '.join(v.split())
            if not v_limpio:
                raise exceptions.NombreVacio
            return v_limpio
        return v

class ProductoResponse(ProductoBase):
    id: int = Field(ge=0)
    unidad_medida_id: int
    unidadMedida: str
    unidad_medida_nombre: Optional[str] = None
    unidad_medida_abreviatura: Optional[str] = None

    nombre_receta: Optional[str] = None
    activo: bool
    visible_publico: bool = False

    model_config = ConfigDict(from_attributes=True)


class VisibilidadPublicaUpdate(BaseModel):
    # ids de los productos que se muestran en la vista publica; el resto queda oculto
    productos_visibles: list[int] = Field(default_factory=list)


class ProductoPublico(BaseModel):
    """Lo que ve cualquiera desde la vista publica: sin receta ni datos internos."""
    id: int
    nombre: str
    descripcion: Optional[str] = None
    unidadMedida: str
    unidad_medida_abreviatura: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)