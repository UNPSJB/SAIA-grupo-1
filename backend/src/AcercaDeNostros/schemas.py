from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import List, Literal, Optional, Union
from src.plan_de_calibracion.schemas import PlanDeCalibracion
from src.plan_De_limpieza.schemas import PlanDeLimpieza
from src.AcercaDeNostros import exceptions



class AcercaDeNosotrosBase(BaseModel):
    descripcion:str = Field(max_length=400)


class AcercaDeNosotrosCreate(AcercaDeNosotrosBase):


    @field_validator("descripcion")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
            if v is None:
             return v
            if all(c.isalnum() or c.isspace() for c in v):
                return v
            raise exceptions.Descripcion_vacia()

class AcercaDeNosotrosUpdate(BaseModel):
    descripcion:Optional[str]= Field(None, max_length=400)

    @field_validator("descripcion")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
                 if all(c.isalnum() or c.isspace() for c in v):
                     return v
                 raise exceptions.Descripcion_vacia()

class AcercaDeNosotros(AcercaDeNosotrosBase):
      id:int
      model_config= ConfigDict(from_attributes=True)