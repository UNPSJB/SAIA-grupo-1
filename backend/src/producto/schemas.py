from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.producto.models import UnidadMedida
from src.producto import exceptions

class ProductoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    descripcion: Optional[str] = Field(default=None, min_length=1, max_length=100)
    unidadMedida: Optional[UnidadMedida] = None
    id_receta: Optional[int] = None
    receta_id: Optional[int] = None
    tamano_porcion_g: Optional[float] = None
    porciones_por_envase: Optional[float] = None
    descripcion_porcion: Optional[str] = None

class ProductoCreate(ProductoBase):
    @field_validator('nombre')
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        v_limpio = ' '.join(v.split())
        if not v_limpio:
            raise exceptions.NombreVacio
        return v_limpio

    @field_validator("unidadMedida", mode="before")
    @classmethod
    def validar_unidad_medida_obligatoria(cls, v: Any) -> Any:
        if v is None or (isinstance(v, str) and not v.strip()):
            raise exceptions.UnidadVacia
        return v

class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    unidadMedida: Optional[UnidadMedida] = None
    id_receta: Optional[int] = None
    receta_id: Optional[int] = None
    tamano_porcion_g: Optional[float] = None
    porciones_por_envase: Optional[float] = None
    descripcion_porcion: Optional[str] = None

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
    nombre_receta: Optional[str] = None
    activo: bool
    visible_publico: bool = False

    model_config = ConfigDict(from_attributes=True)

class VisibilidadPublicaUpdate(BaseModel):
    productos_visibles: list[int] = Field(default_factory=list)

class ProductoPublico(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    unidadMedida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)

ProductoCatalogoPublico = ProductoPublico
