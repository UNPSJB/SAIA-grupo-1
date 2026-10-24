from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Periodo = Literal["dia", "diaria", "diario", "semana", "mes"]
AgrupacionGrafico = Literal["dia", "semana"]


class CumplimientoResumen(BaseModel):
    hechas: int
    pendientes: int
    vencidas: int = 0
    porcentaje: float


class ConsumoInsumo(BaseModel):
    nombre: str
    cantidad: float
    unidad: str


class ConsumoResumen(BaseModel):
    consumo: List[ConsumoInsumo]
    unidades_disponibles: List[str] = Field(default_factory=list)
    unidad_actual: Optional[str] = None


class DashboardResumen(BaseModel):
    cumplimiento_actual: CumplimientoResumen
    consumo_insumos: List[ConsumoInsumo]
    unidades_disponibles: List[str] = Field(default_factory=list)
    unidad_actual: Optional[str] = None


class PuntoCumplimiento(BaseModel):
    fecha: Optional[date] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    etiqueta: str
    total_checklists: int
    total_tareas: int
    tareas_completadas: int
    tareas_pendientes: int
    porcentaje: float


class GraficoCumplimientoResponse(BaseModel):
    agrupacion: AgrupacionGrafico
    desde: date
    hasta: date
    total_checklists: int
    total_tareas: int
    tareas_completadas: int
    promedio_cumplimiento: float
    puntos: List[PuntoCumplimiento]
