from datetime import date, datetime
from typing import Dict, List, Literal, Optional
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


AgrupacionTiempo = Literal["dia", "semana", "mes"]


class MovimientoInsumoQuimico(BaseModel):
    id: str
    fecha: date
    fecha_hora: Optional[datetime] = None
    insumo_id: Optional[int] = None
    insumo_nombre: str
    tipo: Optional[str] = None
    proveedor: Optional[str] = None
    cantidad: float
    unidad: str
    responsable_legajo: Optional[int] = None
    responsable_nombre: Optional[str] = None
    tarea_nombre: str
    plan_nombre: str
    sector_o_equipo: Optional[str] = None
    checklist_id: int


class PuntoEvolucionConsumo(BaseModel):
    fecha: date
    etiqueta: str
    total_consumido: float
    por_tipo: Dict[str, float] = Field(default_factory=dict)


class ConsumoAgrupadoItem(BaseModel):
    clave: str
    etiqueta: str
    cantidad_total: float
    porcentaje: float
    cantidad_movimientos: int
    unidad: str


class MetricasConsumoHistorico(BaseModel):
    consumo_total_periodo: float
    consumo_periodo_anterior: float
    variacion_porcentual: Optional[float] = None
    promedio_diario: float
    total_movimientos: int
    quimico_mas_consumido: Optional[str] = None
    cantidad_quimico_mas_consumido: Optional[float] = None
    unidad_predominante: str


class ConsumoHistoricoResponse(BaseModel):
    desde: Optional[date] = None
    hasta: Optional[date] = None
    insumo_id: Optional[int] = None
    unidad_seleccionada: Optional[str] = None
    unidades_disponibles: List[str] = Field(default_factory=list)
    agrupacion_tiempo: AgrupacionTiempo = "dia"
    total_registros: int
    metricas: MetricasConsumoHistorico
    evolucion: List[PuntoEvolucionConsumo] = Field(default_factory=list)
    por_tipo: List[ConsumoAgrupadoItem] = Field(default_factory=list)
    por_proveedor: List[ConsumoAgrupadoItem] = Field(default_factory=list)
    movimientos: List[MovimientoInsumoQuimico] = Field(default_factory=list)
