from pydantic import BaseModel, Field, field_validator, AliasChoices, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from src.alergenos import exceptions




class AlergenoBase(BaseModel):
    nombre:str
    simbolo: str = Field(max_length=500)

class AlergenoCreate(AlergenoBase):
    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
            if v is None:
                return None
            caracteres_permitidos = ".,;()-_"
            if v and all(c.isalnum() or c.isspace() or c in caracteres_permitidos for c in v):
                return v
            raise exceptions.Nombre_Vacio()


class AlergenoUpdate(BaseModel):
     nombre:Optional[str] = None
     simbolo:Optional[str] = Field(None,max_length=500)

     @field_validator("nombre")
     @classmethod
     def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
                 if v is None:
                     return None
                 caracteres_permitidos = ".,;()-_"
                 if v and all(c.isalnum() or c.isspace() or c in caracteres_permitidos for c in v):
                     return v
                 raise exceptions.Nombre_Vacio()

class Alergeno(AlergenoBase):
     id:int
     activo: bool = True

     model_config=ConfigDict(from_attributes=True)