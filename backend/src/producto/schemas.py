import re
from typing import List, Optional, Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.alergenos.schemas import Alergeno
from src.recetas.schemas import RecetaBase
from src.producto import exceptions

class ProductoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    descripcion: Optional[str] = Field(default=None, min_length=1, max_length=100)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    tamano_porcion_g: Optional[float] = None
    porciones_por_envase: Optional[float] = None
    descripcion_porcion: Optional[str] = None
    equivalencia_gramos_unidad: Optional[float] = None
    cantidad_por_envase: Optional[float] = None
    peso_unidad_g: Optional[float] = None
    aplica_rotulado: Optional[bool] = True
    conservacion:Optional[str] = None

class ProductoCreate(ProductoBase):
    id_receta: Optional[int] = None
    receta: Optional[RecetaBase] = None
    alergenos_precaucion_ids: Optional[list[int]]= None

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

    @field_validator("conservacion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
            if v and re.match(r"^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s°.,-]+$", v):  #este RE le permite al usuario ingresar comas, puntos numeros y espacios
                        return v
            raise exceptions.Conservacion_invalida()

class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    id_receta: Optional[int] = None
    receta: Optional[RecetaBase] = None
    tamano_porcion_g: Optional[float] = None
    porciones_por_envase: Optional[float] = None
    descripcion_porcion: Optional[str] = None
    equivalencia_gramos_unidad: Optional[float] = None
    cantidad_por_envase: Optional[float] = None
    tamano_porcion_g: Optional[float] = None
    equivalencia_gramos_unidad: Optional[float] = None
    cantidad_por_envase: Optional[float] = None
    peso_unidad_g: Optional[float] = None
    aplica_rotulado: Optional[bool] = None
    alergenos_precaucion_ids:Optional[list[int]]=None
    conservacion:Optional[str] = None


    @field_validator('nombre')
    @classmethod
    def validar_nombre_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_limpio = ' '.join(v.split())
            if not v_limpio:
                raise exceptions.NombreVacio
            return v_limpio
        return v

    @field_validator("conservacion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
                if v and re.match(r"^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s°.,-]+$", v):  #este RE le permite al usuario ingresar comas, puntos numeros y espacios
                            return v
                raise exceptions.Conservacion_invalida()

class ProductoResponse(ProductoBase):
    id: int = Field(ge=0)
    unidad_medida_id: int
    unidadMedida: str
    unidad_medida_nombre: Optional[str] = None
    unidad_medida_abreviatura: Optional[str] = None
    id_receta: Optional[int] = None
    nombre_receta: Optional[str] = None
    equivalencia_gramos_unidad: Optional[float] = None
    cantidad_por_envase: Optional[float] = None
    peso_unidad_g: Optional[float] = None
    aplica_rotulado: bool = True
    activo: bool
    visible_publico: bool = False
    alergenos_precaucion:Optional[List[Alergeno]] = None

    model_config = ConfigDict(from_attributes=True)

class VisibilidadPublicaUpdate(BaseModel):
    productos_visibles: list[int] = Field(default_factory=list)

class ProductoPublico(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    unidadMedida: str
    unidad_medida_abreviatura: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

ProductoCatalogoPublico = ProductoPublico
