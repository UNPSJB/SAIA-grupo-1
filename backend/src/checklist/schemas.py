import json
from datetime import date, datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.checklist import exceptions
from src.checklist.models import EstadoGeneralChecklist, EstadoTareaItem, MotivoNoRealizado
from src.tareas.models import Frecuencia


class InsumoQuimicoUtilizado(BaseModel):
    id: Optional[int] = None
    nombre: str = Field(..., min_length=1, max_length=100)
    cantidad: float = Field(..., gt=0)
    unidad: Optional[str] = Field("L", max_length=30)


InsumoUtilizadoPlaceholder = InsumoQuimicoUtilizado


class CompletarTareaSchema(BaseModel):
    responsable_legajo: int = Field(...)
    insumos_utilizados: List[InsumoUtilizadoPlaceholder] = Field(default_factory=list)


class MarcarNoRealizadaSchema(BaseModel):
    motivo: Union[MotivoNoRealizado, str]
    observacion: Optional[str] = None

    @field_validator("motivo", mode="before")
    @classmethod
    def parse_motivo(cls, v: Any) -> Any:
        if not v or (isinstance(v, str) and not v.strip()):
            raise exceptions.MotivoNoRealizadoRequerido()
        if isinstance(v, MotivoNoRealizado):
            return v
        if isinstance(v, str):
            val_clean = v.strip().lower()
            for m in MotivoNoRealizado:
                if m.value == val_clean or m.name.lower() == val_clean:
                    return m
            return v.strip()
        raise exceptions.MotivoInvalido()

    @model_validator(mode="after")
    def validar_observacion(self) -> "MarcarNoRealizadaSchema":
        m_str = str(self.motivo.value if hasattr(self.motivo, "value") else self.motivo).strip().lower()
        if m_str in ("otro", MotivoNoRealizado.OTRO.value):
            if not self.observacion or not self.observacion.strip():
                raise exceptions.ObservacionObligatoriaParaOtro()
        return self


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
    motivo_no_realizado: Optional[Union[MotivoNoRealizado, str]] = None
    observacion_no_realizado: Optional[str] = None
    fecha_hora_no_realizado: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("frecuencia", mode="before")
    @classmethod
    def parse_frecuencia(cls, v: Any) -> Any:
        if isinstance(v, Frecuencia):
            return v
        if isinstance(v, str):
            val = v.upper()
            if val == "DIARIO":
                val = "DIARIA"
            if val in Frecuencia.__members__:
                return Frecuencia[val]
        return v

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
    # Lo completa el router con el usuario de la sesión: cada operador genera su propio checklist.
    responsable_legajo: Optional[int] = None
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
        if v < date.today():
            raise exceptions.ChecklistFechaPasada()
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
    tareas_no_realizadas: int = 0
    tareas_pendientes: int
    tareas_vencidas: int = 0
    items: List[ChecklistItem]

    model_config = ConfigDict(from_attributes=True)
