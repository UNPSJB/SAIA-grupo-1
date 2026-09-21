from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Literal, Optional
from src.tareas.models import Frecuencia
from src.tareas import exceptions


class TareaBase(BaseModel):
    nombre:str=Field(max_length=20)
    descripcion:str=Field(max_length=100)
    frecuencia:Frecuencia

    @field_validator(
                "frecuencia", mode="before"
            )
    @classmethod
    def is_valid_frecuencia(cls, v: str) -> str:
                if isinstance(v, Frecuencia):
                    return v
                
                if isinstance(v, str):
                    val_upper = v.upper()
                    if val_upper in Frecuencia.__members__:
                        return Frecuencia[val_upper]
                        
                raise exceptions.FRECUENCIAInvalida(list(Frecuencia))

class TareaCreate(TareaBase):
    nombre:str= Field(max_length=20)
    descripcion:str = Field(max_length=100)
    plan_id:int

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v):
                if v.isalpha():
                    return v
                raise exceptions.NombreConNumeros()
    
    @field_validator("nombre","descripcion")
    @classmethod
    def validar_longitud(cls,v):
             if len(v)>1:
                  return v
             raise exceptions.Nombre_Invalido()

class TareaUpdate(TareaBase):
      nombre:Optional[str]= Field(None,max_length=20)
      descripcion:Optional[str]=Field(None,max_length=100)
      plan_id:Optional[int]=None

      @field_validator("nombre")
      @classmethod
      def validar_nombre(cls, v:Optional[str])-> Optional[str]:
                      if v is None:
                        return None
                      if v.isalpha():
                          return v
                      raise exceptions.NombreConNumeros()
          
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
      nombre_plan:str
      model_config = ConfigDict(from_attributes=True)
