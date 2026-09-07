from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal
from src.equipos.models import Categoria

class EquipoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=20)
    ubicacion: str = Field(min_length=1, max_length=50)
    categoria: Categoria
    plan_de_Limpieza: str = Field(min_length=1, max_length =100)
    plan_de_calibracion: str = Field(min_length=1, max_length=100)


class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    pass    

class Equipo(EquipoBase):
    id:int
    model_config = ConfigDict(from_attributes=True)