from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.proveedores import exceptions


class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    cuit: Optional[str] = Field(default=None, max_length=20)
    contacto: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=200)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("cuit", "contacto", "telefono", "email", "direccion")
    @classmethod
    def validar_opcionales(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    cuit: Optional[str] = Field(default=None, max_length=20)
    contacto: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=200)
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

    @field_validator("cuit", "contacto", "telefono", "email", "direccion")
    @classmethod
    def validar_opcionales(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class Proveedor(ProveedorBase):
    id: int
    activo: bool = True
    total_insumos: int = 0

    model_config = ConfigDict(from_attributes=True)
