from typing import List, Literal
from pydantic import BaseModel

Periodo = Literal["semana", "mes"]


class CumplimientoResumen(BaseModel):
    hechas: int
    pendientes: int
    porcentaje: float


class ConsumoInsumo(BaseModel):
    nombre: str
    cantidad: float
    unidad: str


class DashboardResumen(BaseModel):
    cumplimiento_actual: CumplimientoResumen
    consumo_insumos: List[ConsumoInsumo]
