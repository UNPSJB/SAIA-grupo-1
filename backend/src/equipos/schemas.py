from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Literal, Optional
from src.plan_De_limpieza.schemas import PlanDeLimpieza
from src.equipos.models import Categoria
from src.equipos.models import Estado
from src.equipos import exceptions
class EquipoBase(BaseModel):
    nombre: str = Field( max_length=20)
    ubicacion: str = Field( max_length=50)
    categoria: Categoria
    estado:Estado
    plan_de_calibracion: str = Field(min_length=1, max_length=100)

    @field_validator(
            "categoria", mode="before"
        )
    @classmethod
    def is_valid_categoria(cls, v: str) -> str:
            if isinstance(v, Categoria):
                return v
            
            if isinstance(v, str):
                val_upper = v.upper()
                if val_upper in Categoria.__members__:
                    return Categoria[val_upper]
                    
            raise exceptions.CATEGORIAInvalida(list(Categoria))


class EquipoCreate(EquipoBase):
    nombre: str = Field( max_length=20)
    ubicacion: str = Field(max_length=50)

    @field_validator('nombre')
    @classmethod
    def validar_nombre(cls, v):
        if all(c.isalnum() or c.isspace() for c in v):
            return v
        raise exceptions.NombreConNumeros()
    
    @field_validator('ubicacion')
    @classmethod
    def validar_ubicacion(cls, v):
            if all(c.isalnum() or c.isspace() for c in v):
                return v
            raise exceptions.UbicacionConNumeros()
    @field_validator('ubicacion','nombre')
    @classmethod
    def validar_largoDNombre(cls,v):

         if len(v)>=4:
              return v
         raise exceptions.CadenaMayorOigualACUATRO()
         

class EquipoUpdate(EquipoBase):
    nombre: Optional[str] = Field( None,max_length=20)  
    ubicacion: Optional[str] = Field( None,max_length=50)
    categoria:Optional[Categoria]=None
    plan_de_calibracion:Optional[str] = Field( None,max_length=100)


    @field_validator(
                "categoria", mode="before"
            )
    @classmethod
    def is_valid_categoria(cls, v: Optional[str]) -> Optional[Categoria]:
                
                if v is None:
                    return None
                if isinstance(v, Categoria):
                    return v
                if isinstance(v, str):
                    val_upper = v.upper()
                    if val_upper in Categoria.__members__:
                        return Categoria[val_upper]
                raise exceptions.CATEGORIAInvalida(list(Categoria))

    @field_validator('nombre')
    @classmethod
    def validar_nombre(cls, v:Optional[str])-> Optional[str] :

            if v is None:
                 return None
            if all(c.isalnum() or c.isspace() for c in v):
                return v
            raise exceptions.NombreConNumeros()
        
    @field_validator('ubicacion')
    @classmethod
    def validar_ubicacion(cls, v:Optional[str]) -> Optional[str]:
                if v is None:
                                 return None
                if all(c.isalnum() or c.isspace() for c in v):
                    return v
                raise exceptions.UbicacionConNumeros()
    @field_validator('ubicacion','nombre')
    @classmethod
    def validar_largoDNombre(cls,v:Optional[str])-> Optional[str]:

             if v is None:
                return None
    
             if len(v)>=4:
                  return v
             raise exceptions.CadenaMayorOigualACUATRO()

class Equipo(EquipoBase):
    id:int
    plan_de_Limpieza: Optional[PlanDeLimpieza] = None
    model_config = ConfigDict(from_attributes=True)