from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Literal, Optional
from src.tareas.schemas import Tarea
from src.plan_De_limpieza import exceptions




class PlanDeLimpiezaBase(BaseModel):
    nombre:str=Field(max_length=20)


class PlanDeLimpiezaCreate(PlanDeLimpiezaBase):

    nombre:str= Field(max_length=20)
    equipo_id:int
    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v):
            if v.isalpha():
                return v
            raise exceptions.NombreConNumeros()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls,v):
         if len(v)>1:
              return v
         raise exceptions.NombreError()

class PlanDeLimpiezaUpdate(PlanDeLimpiezaBase):
     nombre:Optional[str]=Field(None,max_length=20)
     equipo_id:Optional[int]=None

     @field_validator("nombre")
     @classmethod
     def validar_nombre(cls, v:Optional[str])->Optional[str]:

                 if v is None:
                    return None
                 if v.isalpha():
                     return v
                 raise exceptions.NombreConNumeros()
     
     @field_validator("nombre")
     @classmethod
     def validar_longitud(cls,v:Optional[str])->Optional[str]:
              
              if v is None:
                return None
              if len(v)>1:
                   return v
              raise exceptions.NombreError()

class PlanDeLimpieza(PlanDeLimpiezaBase):
     id:int
     equipo_id:int
     nombre_equipo:str
     tareas:Optional[List[Tarea]] = None
     model_config = ConfigDict(from_attributes=True)