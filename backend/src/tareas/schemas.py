import re

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Literal, Optional
from src.tareas.models import Frecuencia
from src.tareas import exceptions


class TareaBase(BaseModel):
    nombre:str=Field(max_length=50)
    descripcion:str
    frecuencia:Frecuencia
    personal_id:int

    @field_validator(
                "frecuencia", mode="before"
            )
    @classmethod
    def is_valid_frecuencia(cls, v: Any) -> Frecuencia:
                if isinstance(v, Frecuencia):
                    return v
                
                if isinstance(v, str):
                    val_upper = v.upper()
                    if val_upper in Frecuencia.__members__:
                        return Frecuencia[val_upper]
                        
                raise exceptions.FRECUENCIAInvalida(list(Frecuencia))

class TareaCreate(TareaBase):
    nombre:str= Field(max_length=50)
    descripcion:str
    plan_id:int

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v):
                if v and all(c.isalnum() or c.isspace() for c in v):
                    return v
                raise exceptions.NombreConNumeros()
    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v):
                if v and re.match(r"^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s°.,-]+$", v):  #este RE le permite al usuario ingresar comas, puntos numeros y espacios
                    return v
                raise exceptions.DescripcionInvalidad()
    
    @field_validator("nombre","descripcion")
    @classmethod
    def validar_longitud(cls,v):
             if len(v)>1:
                  return v
             raise exceptions.Nombre_Invalido()

class TareaUpdate(TareaBase):
      nombre:Optional[str]= Field(None,max_length=50)
      descripcion:Optional[str]=Field(None)
      plan_id:Optional[int]=None

      @field_validator("nombre")
      @classmethod
      def validar_nombre(cls, v:Optional[str])-> Optional[str]:
                      if v is None:
                        return None
                      if v and all(c.isalnum() or c.isspace() for c in v):
                          return v
                      raise exceptions.NombreConNumeros()

      @field_validator("descripcion")
      @classmethod
      def validar_descripcion(cls, v:Optional[str]) -> Optional[str]:
                      if v is None:
                             return None
                      if v and re.match(r"^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s°.,-]+$", v):  #este RE le permite al usuario ingresar comas, puntos numeros y espacios
                          return v
                      raise exceptions.DescripcionInvalidad()
          
      @field_validator("nombre","descripcion")
      @classmethod
      def validar_longitud(cls,v:Optional[str])-> Optional[str]:

            if v is None:
                return None
            if len(v)>1:
                return v
            raise exceptions.Nombre_Invalido()


class Tarea(TareaBase):
      id:int
      plan_id:int
      personal_id:int
      nombre_plan:str
      nombre_personal:str
      model_config = ConfigDict(from_attributes=True)
