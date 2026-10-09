from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class Capacidades(str, Enum):
    OPERAR = "OPERAR"
    ADMINISTRAR = "ADMINISTRAR"
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
    contrasenia: str = Field(..., min_length=8, max_length=72)

class PersonalUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    documento: Optional[int] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    capacidad: Optional[Capacidades] = None
    contrasenia: Optional[str] = Field(None, min_length=8, max_length=72)


class TareaAsignada(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)


class Personal(PersonaBase):
    legajo: int
    usuario: str
    tareas: List[TareaAsignada] = []
    model_config = ConfigDict(from_attributes=True)

PersonaResponse = Personal
PersonaCreate = PersonalCreate
PersonaUpdate = PersonalUpdate