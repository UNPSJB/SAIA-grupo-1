from datetime import date, datetime
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

Periodo = Literal["dia", "diaria", "diario", "semana", "mes"]
AgrupacionGrafico = Literal["dia", "semana"]
AgrupacionTiempo = Literal["dia", "semana", "mes"]

class CumplimientoResumen(BaseModel):
    hechas: int = 0
    pendientes: int = 0
    vencidas: int = 0
    porcentaje: float = 0.0

class ConsumoInsumo(BaseModel):
    nombre: str
    cantidad: float
    unidad: Optional[str] = None

class ConsumoResumen(BaseModel):
    consumo: List[ConsumoInsumo] = Field(default_factory=list)
    unidades_disponibles: List[str] = Field(default_factory=list)
    unidad_actual: Optional[str] = None

class DashboardResumen(BaseModel):
    cumplimiento_actual: CumplimientoResumen
    cumplimiento: Optional[CumplimientoResumen] = None
    consumo_insumos: List[ConsumoInsumo]
    periodo: Optional[str] = None
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
    agrupacion_tiempo: AgrupacionTiempo
    total_registros: int
    metricas: MetricasConsumoHistorico
    evolucion: List[PuntoEvolucionConsumo]
    por_tipo: List[ConsumoAgrupadoItem]
    por_proveedor: List[ConsumoAgrupadoItem]
    movimientos: List[MovimientoInsumoQuimico]

class PuntoTendenciaCumplimiento(BaseModel):
    fecha: date
    etiqueta: str
    total_tareas: int
    tareas_completadas: int
    tareas_pendientes: int
    porcentaje: float

class CumplimientoDesgloseItem(BaseModel):
    id: int
    nombre: str
    subtitulo: Optional[str] = None
    total_tareas: int
    tareas_completadas: int
    tareas_pendientes: int
    porcentaje: float

class ItemDetalleChecklist(BaseModel):
    id: int
    checklist_id: int
    fecha: date
    nombre_tarea: str
    frecuencia: str
    sector_o_equipo: str
    tipo_objeto: str
    responsable: str
    turno: str
    estado: str
    hora_fin: Optional[str] = None

class KpisCumplimientoDetallado(BaseModel):
    total_checklists: int
    total_tareas: int
    tareas_completadas: int
    tareas_pendientes: int
    porcentaje_general: float
    sector_menor_cumplimiento: Optional[str] = None
    porcentaje_sector_menor: Optional[float] = None
    equipo_menor_cumplimiento: Optional[str] = None
    porcentaje_equipo_menor: Optional[float] = None
    turno_critico: Optional[str] = None
    porcentaje_turno_critico: Optional[float] = None

class CumplimientoDetalladoResponse(BaseModel):
    desde: Optional[date] = None
    hasta: Optional[date] = None
    sector_id: Optional[int] = None
    turno: Optional[str] = None
    kpis: KpisCumplimientoDetallado
    tendencia_temporal: List[PuntoTendenciaCumplimiento]
    desglose_por_sector: List[CumplimientoDesgloseItem]
    desglose_por_equipo: List[CumplimientoDesgloseItem]
    desglose_por_turno: List[CumplimientoDesgloseItem]
    items_detalle: List[ItemDetalleChecklist]
