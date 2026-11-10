from pydantic import BaseModel, Field, field_validator, AliasChoices, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from src.calibracion_realizada import exceptions




class CalibracionRealizadaBase(BaseModel):

    fecha_d_realizacion: datetime =Field(validation_alias=AliasChoices("fecha_d_realizacion", "fecha_d_realizacion"))
    formato_archivo:Optional[str] = Field(None,max_length=500)

class CalibracionRealizadaCreate(CalibracionRealizadaBase):
    plan_calibracion_id:int 

    @field_validator("fecha_d_realizacion")
    @classmethod
    def validar_fecha_d_realizacion(cls, v: Optional[datetime]) -> Optional[datetime]:
                if v is not None:
                    v_naive = v.replace(tzinfo=None) if v.tzinfo else v
                                
                    if v_naive < datetime.now():
                     raise exceptions.FECHA_ERROR()
                return v


class CalibracionRealizada(CalibracionRealizadaBase):
      id:int
      plan_calibracion_id:int
      nombre_plan_calibracion:str

      model_config = ConfigDict(from_attributes=True)
