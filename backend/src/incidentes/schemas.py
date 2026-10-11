from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.incidentes.constants import EstadoIncidente


class IncidenteUpdate(BaseModel):
    descripcion: str


class IncidenteEstadoUpdate(BaseModel):
    estado: EstadoIncidente


class IncidenteCerrar(BaseModel):
    accion_correctiva: str


class IncidenteReabrir(BaseModel):
    motivo: str


class Incidente(BaseModel):
    id: int
    descripcion: str
    estado: EstadoIncidente
    creado_el: datetime
    reportado_por_id: int
    nombre_reportante: str
    foto_url: Optional[str] = None
    accion_correctiva: Optional[str] = None
    cerrado_el: Optional[datetime] = None
    resuelto_por_id: Optional[int] = None
    nombre_resolutor: Optional[str] = None
    motivo_reapertura: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MetricasAntiguedad(BaseModel):
    menos_24h: int
    entre_24h_y_72h: int
    mas_72h: int


class IncidentesMetricas(BaseModel):
    total_abiertos: int
    por_antiguedad: MetricasAntiguedad
    por_estado: dict[str, int]
    mas_antiguo_horas: Optional[float] = None
    mas_antiguo_id: Optional[int] = None


class IncidenteAbierto(Incidente):
    horas_abierto: float
    dias_abierto: int
    nivel_urgencia: str

