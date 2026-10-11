from pydantic import BaseModel, Field, field_validator, AliasChoices, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from src.plan_de_calibracion import exceptions



class PlanDeCalibracionBase(BaseModel):
    nombre: str = Field(max_length=50)
    periodicidad_De_cambio: int
    fecha_mantenimiento: datetime = Field(validation_alias=AliasChoices("fecha_mantenimiento", "fecha_mantenimiento"))
    fecha_vencimiento: Optional[datetime] = Field(None, validation_alias=AliasChoices("fecha_vencimiento", "fechaVencimiento"))
    descripcion: str


class PlanDeCalibracionCreate(PlanDeCalibracionBase):
    periodicidad_De_cambio: int
    equipo_id: int
    
    @field_validator("fecha_mantenimiento")
    @classmethod
    def validar_fecha_mantenimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
            if v is not None and v < datetime.now():
                raise exceptions.FechaAnterior()
            return v

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v and all(c.isalnum() or c.isspace() for c in v):
            return v
        raise exceptions.NombreInvalido()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v):
        if len(v) > 1:
            return v
        raise exceptions.NombreVacio()

    @field_validator("periodicidad_De_cambio")
    @classmethod
    def validar_periodicidad(cls, v):
        if v > 0:
            return v
        raise exceptions.PeriodicidadInvalida()

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v):
        if len(v) > 0:
            return v
        raise exceptions.DescripcionVacia()

class PlanDeCalibracionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    periodicidad_De_cambio: Optional[int] = None
    fecha_mantenimiento: Optional[datetime] = Field(None, validation_alias=AliasChoices("fecha_mantenimiento", "fecha_mantenimiento"))
    equipo_id: Optional[int] = None
    fecha_vencimiento: Optional[datetime] = Field(None, validation_alias=AliasChoices("fecha_vencimiento", "fechaVencimiento"))
    descripcion: Optional[str] = None


    @field_validator("periodicidad_De_cambio")
    @classmethod
    def validar_periodicidad(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v > 0:
            return v
        raise exceptions.PeriodicidadInvalida()

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v and all(c.isalnum() or c.isspace() for c in v):
            return v
        raise exceptions.NombreInvalido()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) > 1:
            return v
        raise exceptions.NombreVacio()

    @field_validator("fecha_mantenimiento")
    @classmethod
    def validar_fecha_mantenimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v < datetime.now():
            raise exceptions.FechaAnterior()
        return v

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) > 0:
            return v
        raise exceptions.DescripcionVacia()

class PlanDeCalibracion(PlanDeCalibracionBase):
    id: int
    equipo_id: int
    nombre_equipo: str

    model_config = ConfigDict(from_attributes=True)