import json
from datetime import date, datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.checklist import exceptions
from src.checklist.models import EstadoGeneralChecklist, EstadoTareaItem
from src.tareas.models import Frecuencia


class InsumoUtilizadoPlaceholder(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    cantidad: float = Field(..., gt=0)
    unidad: Optional[str] = Field("unidades", max_length=30)


class CompletarTareaSchema(BaseModel):
    responsable_legajo: int = Field(...)
    insumos_utilizados: List[InsumoUtilizadoPlaceholder] = Field(default_factory=list)


class ChecklistItem(BaseModel):
    id: int
    checklist_id: int
    plan_id: Optional[int] = None
    nombre_plan: str
    nombre_equipo: Optional[str] = None
    tarea_id: Optional[int] = None
    nombre_tarea: str
    descripcion_tarea: Optional[str] = None
    frecuencia: Frecuencia
    estado: EstadoTareaItem
    responsable_legajo: Optional[int] = None
    nombre_responsable: Optional[str] = None
    imagen: Optional[str] = None
    insumos_utilizados: List[InsumoUtilizadoPlaceholder] = Field(default_factory=list)
    fecha_hora_fin: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("insumos_utilizados", mode="before")
    @classmethod
    def parse_insumos_utilizados(cls, v: Any) -> List[Any]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return []
        if isinstance(v, list):
            return v
        return []


class ChecklistGenerar(BaseModel):
    responsable_legajo: int = Field(...)
    fecha: Optional[date] = Field(default_factory=date.today)

    @field_validator("fecha", mode="before")
    @classmethod
    def parsear_fecha(cls, v):
        if v is None:
            return date.today()
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, str) and "T" in v:
            return datetime.fromisoformat(v).date()
        return v

    @field_validator("fecha")
    @classmethod
    def validar_fecha(cls, v: date) -> date:
        if v > date.today():
            raise exceptions.ChecklistFechaFutura()
        return v


class Checklist(BaseModel):
    id: int
    fecha: date
    creado_en: datetime
    activo: bool = True
    responsable_legajo: int
    nombre_responsable: Optional[str] = None
    estado: EstadoGeneralChecklist
    porcentaje_cumplimiento: float
    total_tareas: int
    tareas_completadas: int
    tareas_pendientes: int
    items: List[ChecklistItem]

    model_config = ConfigDict(from_attributes=True)
