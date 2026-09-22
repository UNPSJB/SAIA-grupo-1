from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class Capacidades(str, Enum):
    OPERAR = "OPERAR"
    MANTENIMIENTO = "MANTENIMIENTO"
    AMBAS = "AMBAS"

class PersonaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    documento: int = Field(...)
    email: EmailStr = Field(...)
    telefono: Optional[str] = Field(None, max_length=20)
    activo: bool = Field(default=True)
    capacidad: Capacidades = Field(default=Capacidades.OPERAR)

class PersonalCreate(PersonaBase):
    pass

class PersonalUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    documento: Optional[int] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    capacidad: Optional[Capacidades] = None

class Personal(PersonaBase):
    legajo: int

    model_config = ConfigDict(from_attributes=True)

# Alias de compatibilidad
PersonaResponse = Personal
PersonaCreate = PersonalCreate
PersonaUpdate = PersonalUpdate