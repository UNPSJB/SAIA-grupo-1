from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from src.controlesAmbientales.models import TipoControlAmbiental

# SCHEMAS PARA LAS VISITAS / HISTORIAL
class VisitaControlBase(BaseModel):
    fecha_realizacion: date
    observaciones: Optional[str] = None

class RegistrarVisita(VisitaControlBase):
    pass

class VisitaControl(VisitaControlBase):
    id: int
    control_id: int
    fecha_proximo_vencimiento: date
    certificado_url: Optional[str] = None
    creado_el: datetime

    model_config = ConfigDict(from_attributes=True)



# SCHEMAS PARA EL CONTROL AMBIENTAL
class ControlAmbientalBase(BaseModel):
    tipo: TipoControlAmbiental
    periodicidad_dias: int = Field(gt=0)
    observaciones: Optional[str] = None

class ControlAmbientalCreate(ControlAmbientalBase):
    fecha_realizacion_inicial: Optional[date] = None # Opcional por si se registra la primera visita al crear

class ControlAmbientalUpdate(ControlAmbientalBase):
    tipo: Optional[TipoControlAmbiental] = None
    periodicidad_dias: Optional[int] = Field(None, gt=0)
    observaciones: Optional[str] = None

class ControlAmbiental(ControlAmbientalBase):
    id: int
    ultima_fecha_realizacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    creado_el: datetime
    ultima_visita: Optional[VisitaControl] = None

    model_config = ConfigDict(from_attributes=True)

class ControlAmbientalConHistorial(ControlAmbiental):
    visitas: List[VisitaControl] = []