from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator

from enum import Enum

class Capacidades(str, Enum):
    OPERAR = "operar"
    ADMINISTRAR = "administrar"
    AMBAS = "ambas"
    # Alias en minúsculas por compatibilidad
    operar = "operar"
    administrar = "administrar"
    ambas = "ambas"

class PersonalBase(BaseModel):
    documento: Union[str, int] = Field(...)
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    email: EmailStr = Field(..., max_length=150)
    capacidad: Capacidades = Field(default=Capacidades.OPERAR)

    @field_validator("documento", mode="after")
    @classmethod
    def convertir_documento_a_str(cls, v: Union[str, int]) -> str:
        return str(v)

class PersonalCreate(PersonalBase):
    pass

class PersonalUpdate(BaseModel):
    documento: Optional[Union[str, int]] = None
    nombre: Optional[str] = Field(None, max_length=100)
    apellido: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=150)
    capacidad: Optional[Capacidades] = None

    @field_validator("documento", mode="after")
    @classmethod
    def convertir_documento_a_str(cls, v: Optional[Union[str, int]]) -> Optional[str]:
        return str(v) if v is not None else None

class Personal(PersonalBase):
    legajo: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)