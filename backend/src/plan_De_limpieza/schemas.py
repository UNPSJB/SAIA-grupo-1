from datetime import date, datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator
from typing import List, Literal, Optional
from src.tareas.schemas import Tarea, TareaBase
from src.plan_De_limpieza import exceptions


class PlanDeLimpiezaBase(BaseModel):
    nombre: str = Field(max_length=50)
    fecha_inicio: date = Field(validation_alias=AliasChoices("fecha_inicio", "fechaInicio"))

    @field_validator("fecha_inicio", mode="before")
    @classmethod
    def parsear_fecha_inicio(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, str) and "T" in v:
            return datetime.fromisoformat(v).date()
        return v

    @field_validator("fecha_inicio")
    @classmethod
    def validar_fecha_inicio(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise exceptions.FechaInicioInvalida()
        return v


class PlanDeLimpiezaCreate(PlanDeLimpiezaBase):
    equipo_id: int
    tareas: Optional[List[TareaBase]] = []

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v and all(c.isalnum() or c.isspace() for c in v):
            return v
        raise exceptions.NombreCaracteresRaros()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v):
        if len(v) > 1:
            return v
        raise exceptions.NombreError()


class PlanDeLimpiezaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    fecha_inicio: Optional[date] = Field(None, validation_alias=AliasChoices("fecha_inicio", "fechaInicio"))
    equipo_id: Optional[int] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v and all(c.isalnum() or c.isspace() for c in v):
            return v
        raise exceptions.NombreCaracteresRaros()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) > 1:
            return v
        raise exceptions.NombreError()

    @field_validator("fecha_inicio", mode="before")
    @classmethod
    def parsear_fecha_inicio(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, str) and "T" in v:
            return datetime.fromisoformat(v).date()
        return v

    @field_validator("fecha_inicio")
    @classmethod
    def validar_fecha_inicio(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise exceptions.FechaInicioInvalida()
        return v


class PlanDeLimpieza(PlanDeLimpiezaBase):
    id: int
    equipo_id: int
    nombre_equipo: str
    tareas: Optional[List[Tarea]] = None
    model_config = ConfigDict(from_attributes=True)
