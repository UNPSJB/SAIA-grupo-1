from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List
from enum import Enum

class Capacidades(str,Enum):
    OPERAR = "operar"
    ADMINISTRAR = "administrar"
    AMBOS = "operar/administrar"

class PersonalBase(BaseModel):
    documento: int = Field(ge=0)
    nombre: str = Field(max_digits=20)
    apellido: str = Field(max_digits=20)
    email: EmailStr
    capacidad: Capacidades


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(PersonalBase):
    pass


class Personal(PersonalBase):
    legajo: int = Field(ge=0)

    model_config = ConfigDict(from_attributes= True)
