from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from src.incidentes.constants import EstadoIncidente, TipoIncidente


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
    tipo: TipoIncidente = TipoIncidente.OTRO
    nombre_tipo: Optional[str] = None
    categoria_id: Optional[int] = None
    categoria_nombre: Optional[str] = None
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


class EstadisticaTipoItem(BaseModel):
    tipo: TipoIncidente
    nombre: str
    cantidad: int
    porcentaje: float


class EstadisticaIncidentesPorTipo(BaseModel):
    total: int
    periodo_desde: Optional[date] = None
    periodo_hasta: Optional[date] = None
    por_tipo: List[EstadisticaTipoItem]

