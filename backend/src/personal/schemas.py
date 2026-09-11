import re
from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator

class Capacidades(str, Enum):
    OPERAR = "operar"
    ADMINISTRAR = "administrar"
    AMBAS = "ambas"
    operar = "operar"
    administrar = "administrar"
    ambas = "ambas"

class PersonalBase(BaseModel):
    documento: Union[str, int] = Field(...)
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    email: EmailStr = Field(..., max_length=150)
    capacidad: Capacidades = Field(default=Capacidades.OPERAR)

    # validacones
    @field_validator("documento", mode="after")
    @classmethod
    def validar_documento(cls, v: Union[str, int]) -> str:
        doc_str = str(v).strip()
        if not doc_str.isdigit():
            raise ValueError("El documento solo debe contener números.")
        if len(doc_str) < 7:
            raise ValueError("El documento debe tener al menos 7 dígitos.")
        return doc_str

    @field_validator("nombre", "apellido")
    @classmethod
    def validar_solo_letras(cls, v: str) -> str:
        v_limpio = v.strip()
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v_limpio):
            raise ValueError("Solo puede contener letras y espacios.")
        return v_limpio

class PersonalCreate(PersonalBase):
    pass

class PersonalUpdate(BaseModel):
    documento: Optional[Union[str, int]] = None
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    apellido: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=150)
    capacidad: Optional[Capacidades] = None

    @field_validator("documento", mode="after")
    @classmethod
    def validar_documento(cls, v: Optional[Union[str, int]]) -> Optional[str]:
        if v is None:
            return None
        doc_str = str(v).strip()
        if not doc_str.isdigit():
            raise ValueError("El documento solo debe contener números.")
        if len(doc_str) < 7:
            raise ValueError("El documento debe tener al menos 7 dígitos.")
        return doc_str

    @field_validator("nombre", "apellido")
    @classmethod
    def validar_solo_letras(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_limpio = v.strip()
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v_limpio):
            raise ValueError("Solo puede contener letras y espacios.")
        return v_limpio

class Personal(PersonalBase):
    legajo: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)