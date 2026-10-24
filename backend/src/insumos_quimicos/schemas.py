from datetime import date, datetime
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .constants import TipoQuimicoEnum, UnidadMedidaEnum

# Esquema base general (permite >= 0 para lectura y existencia histórica)
class InsumoQuimicoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    tipo: TipoQuimicoEnum
    unidad_medida: UnidadMedidaEnum
    stock_actual: float = Field(0.0, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre no puede estar vacío ni contener solo espacios.")
        return v.strip()

    @field_validator('proveedor')
    @classmethod
    def validar_proveedor(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_strip = v.strip()
            return v_strip if v_strip else None
        return None

# Solo al CREAR se exige estrictamente mayor a 0
class InsumoQuimicoCreate(InsumoQuimicoBase):
    stock_actual: float = Field(..., gt=0.0, description="Al dar de alta debe ser mayor a 0")

class InsumoQuimicoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    tipo: Optional[TipoQuimicoEnum] = None
    unidad_medida: Optional[UnidadMedidaEnum] = None
    stock_actual: Optional[float] = Field(None, ge=0.0)
    proveedor: Optional[str] = Field(None, max_length=150)
    activo: Optional[bool] = None

class InsumoQuimicoResponse(InsumoQuimicoBase):
    id: int
    activo: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

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
