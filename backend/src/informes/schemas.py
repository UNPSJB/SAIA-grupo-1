from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from src.vencimientos.schemas import VencimientoConsolidadoItem


class Establecimiento(BaseModel):
    nombre: str
    direccion: str = ""
    cuit: str = ""


class CumplimientoPlan(BaseModel):
    nombre_plan: str
    cumplidas: int
    incumplidas: int
    porcentaje: Optional[float]  # None si en el período no hubo tareas evaluables


class ResumenCumplimiento(BaseModel):
    cumplidas: int
    no_realizadas: int
    vencidas: int
    reasignadas: int
    en_curso: int
    porcentaje: Optional[float]
    por_plan: List[CumplimientoPlan]

    @property
    def incumplidas(self) -> int:
        return self.no_realizadas + self.vencidas

    @property
    def evaluadas(self) -> int:
        return self.cumplidas + self.incumplidas


class TareaIncumplida(BaseModel):
    fecha: date
    tarea: str
    plan: str
    ubicacion: Optional[str]
    responsable: Optional[str]
    estado: str
    motivo: Optional[str]
    observacion: Optional[str]
    marcada_el: Optional[datetime]


class TareaReasignada(BaseModel):
    fecha: date
    tarea: str
    plan: str
    responsable_original: Optional[str]
    reasignada_a: Optional[str]
    resultado: str


class IncidenteCerrado(BaseModel):
    id: int
    descripcion: str
    reportado_el: datetime
    reportado_por: str
    accion_correctiva: Optional[str]
    cerrado_el: datetime
    resuelto_por: Optional[str]


class DatosInforme(BaseModel):
    desde: date
    hasta: date
    emitido_el: datetime
    emitido_por: Optional[str] = None
    establecimiento: Establecimiento
    cumplimiento: ResumenCumplimiento
    tareas_incumplidas: List[TareaIncumplida]
    tareas_reasignadas: List[TareaReasignada]
    vencimientos: List[VencimientoConsolidadoItem]
    incidentes_cerrados: List[IncidenteCerrado]
