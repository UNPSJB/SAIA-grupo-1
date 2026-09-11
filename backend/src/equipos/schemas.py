from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Literal
from src.equipos.exceptions import CadenaMayorOigualACUATRO, NombreConNumeros, UbicacionConNumeros
from src.equipos.models import Categoria

class EquipoBase(BaseModel):
    nombre: str = Field( max_length=20)
    ubicacion: str = Field( max_length=50)
    categoria: Categoria
    plan_de_Limpieza: str = Field(min_length=1, max_length =100)
    plan_de_calibracion: str = Field(min_length=1, max_length=100)


class EquipoCreate(EquipoBase):
    nombre: str = Field( max_length=20)
    ubicacion: str = Field(max_length=50)

    @field_validator('nombre')
    def validar_nombre(cls, v):
        if not v.isalpha():
            raise NombreConNumeros()
        return v
    
    @field_validator('ubicacion')
    def validar_ubicacion(cls, v):
            if not v.isalpha():
                raise UbicacionConNumeros()
            return v
    @field_validator('ubicacion','nombre')
    def validar_largoDNombre(cls,v):

         if len(v)<4:
              raise CadenaMayorOigualACUATRO()
         return v
         

class EquipoUpdate(EquipoBase):
    nombre: str = Field( max_length=20)  
    ubicacion: str = Field( max_length=50)

    @field_validator('nombre')
    def validar_nombre(cls, v):
            if not v.isalpha():
                raise NombreConNumeros()
            return v

    @field_validator('ubicacion')
    def validar_ubicacion(cls, v):
                if not v.isalpha():
                    raise UbicacionConNumeros()
                return v 

    @field_validator('ubicacion','nombre')
    def validar_largo(cls,v):
    
             if len(v)<4:
                  raise CadenaMayorOigualACUATRO()
             return v

class Equipo(EquipoBase):
    id:int
    model_config = ConfigDict(from_attributes=True)