from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.incidentes.constants import EstadoIncidente


class IncidenteUpdate(BaseModel):
    descripcion: str


class IncidenteEstadoUpdate(BaseModel):
    estado: EstadoIncidente


class Incidente(BaseModel):
    id: int
    descripcion: str
    estado: EstadoIncidente
    creado_el: datetime
    reportado_por_id: int
    nombre_reportante: str
    foto_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
