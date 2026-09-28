from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Periodo = Literal["dia", "diaria", "diario", "semana", "mes"]


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
