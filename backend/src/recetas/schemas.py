from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from src.recetas import exceptions
from src.recetas.models import CLASE_FUNCIONAL, EstadoEtapaRecetaItem,EstadoGeneralRecetaChecklist


# ==========================================
# SCHEMAS DE RENGLONES (RecetaDetalle)
# ==========================================

class RecetaDetalleBase(BaseModel):
    ingrediente_id: int
    nombre: str = Field(max_length=50)
    cantidad: float
    unidad_medida: str = Field(max_length=20)
    es_aditivo: bool = False
    clase_funcional: Optional[CLASE_FUNCIONAL] = None
    numero_ins: Optional[str] = None
    operario_legajo: int
    descripcion_pasos: str = Field(min_length=1)


class RecetaDetalleCreate(RecetaDetalleBase):

    @field_validator("cantidad")
    @classmethod
    def validar_cantidad(cls, v: float) -> float:
        if v > 0:
            return v
        raise exceptions.CantidadInvalida()

    @field_validator("unidad_medida")
    @classmethod
    def validar_unidad_medida(cls, v: str) -> str:
        if v and len(v.strip()) > 0:
            return v
        raise exceptions.UnidadMedidaVacia()

    @model_validator(mode="after")
    def validar_reglas_aditivo(self) -> "RecetaDetalleCreate":
        if self.es_aditivo:
            if not self.clase_funcional or not self.clase_funcional.strip():
                raise exceptions.AditivoClaseFuncional()

            es_aromatizante = "aromatizante" in self.clase_funcional.lower()
            if not es_aromatizante and (not self.numero_ins or not self.numero_ins.strip()):
                raise exceptions.AditivoNumeroINS()
        else:
            self.clase_funcional = None
            self.numero_ins = None

        return self
    @field_validator("descripcion_pasos")
    @classmethod
    def validar_descripcion(cls, v):
            if len(v) > 0:
                return v
            raise exceptions.DescripcionVacia()
    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
            if v is None:
                return None
            if v and all(c.isalnum() or c.isspace() for c in v):
                return v
            raise exceptions.NombreInvalido()
    
    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v):
            if len(v) > 1:
                return v
            raise exceptions.NombreVacio()


class RecetaDetalle(RecetaDetalleBase):
    id: int
    version_receta_id: int
    operario_legajo: int
    nombre_operario: Optional[str] = None    
    nombre_ingrediente: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS DE VERSIONES (VersionReceta)
# ==========================================

class VersionRecetaBase(BaseModel):
    rendimiento_final: float
    fecha_vigencia: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None


class VersionRecetaCreate(VersionRecetaBase):
    responsable_legajo: Optional[int] = None
    detalles: List[RecetaDetalleCreate] = []


    @model_validator(mode="after")
    def validar_al_menos_un_ingrediente(self) -> "VersionRecetaCreate":
        if not self.detalles:
            raise exceptions.AgregueIngredientes()
        tiene_ingrediente = any(not d.es_aditivo for d in self.detalles)
        if not tiene_ingrediente:
            raise exceptions.AgregueIngredientes()
        return self
    @field_validator("fecha_vigencia","fecha_vencimiento")
    @classmethod
    def validar_fechas_version(cls, v: datetime) -> datetime:
                    
                    if v is not None:
                        v_naive = v.replace(tzinfo=None) if v.tzinfo else v
                        
                        if v_naive < datetime.now():
                         raise exceptions.FechaAnterior()
                    return v


class VersionRecetaResponse(VersionRecetaBase):
    id: int
    receta_id: int
    version: int
    archivado: bool
    es_vigente: bool
    #fecha_archivo: Optional[date] = None
    usuario: str
    creado_el: datetime
    detalles: Optional[List[RecetaDetalle]] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS DE LA RECETA (RecetaVersionada)
# ==========================================

class RecetaBase(BaseModel):
    nombre: str = Field(max_length=50)
    rendimiento_final: float
    fecha_creacion: datetime


class RecetaCreate(RecetaBase):
    detalles: List[RecetaDetalleCreate] 
    fecha_vigencia: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        caracteres_permitidos = ".,;()-_"
        if v and all(c.isalnum() or c.isspace() or c in caracteres_permitidos for c in v):
            return v
        raise exceptions.NombreInvalido()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v: str) -> str:
        if len(v.strip()) > 1:
            return v
        raise exceptions.NombreInvalido()


    @model_validator(mode="after")
    def validar_ingredientes_receta(self) -> "RecetaCreate":
        if not self.detalles:
            raise exceptions.AgregueIngredientes()
        tiene_ingrediente = any(not d.es_aditivo for d in self.detalles)
        if not tiene_ingrediente:
            raise exceptions.AgregueIngredientes()
        return self

    @field_validator("fecha_creacion")
    @classmethod
    def validar_fecha_creacion(cls, v: datetime) -> datetime:
                
        if v is not None:
            v_naive = v.replace(tzinfo=None) if v.tzinfo else v
            if v_naive.date() < date.today(): 
                raise exceptions.FechaAnterior()
        return v

    @field_validator("fecha_vigencia", "fecha_vencimiento")
    @classmethod
    def validar_fechas_version(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            v_naive = v.replace(tzinfo=None) if v.tzinfo else v
            if v_naive.date() < date.today():
                raise exceptions.FechaAnterior()
        return v


class RecetaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    rendimiento_final: Optional[float] = None
    fecha_creacion: Optional[datetime] = None
    fecha_vigencia: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    detalles: Optional[List[RecetaDetalleCreate]] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        caracteres_permitidos = ".,;()-_"
        if v and all(c.isalnum() or c.isspace() or c in caracteres_permitidos for c in v):
            return v
        raise exceptions.NombreInvalido()

    @field_validator("nombre")
    @classmethod
    def validar_longitud(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v.strip()) > 1:
            return v
        raise exceptions.NombreInvalido()


    @model_validator(mode="after")
    def validar_ingredientes_update(self) -> "RecetaUpdate":
        if not self.detalles:
            raise exceptions.AgregueIngredientes()
        tiene_ingrediente = any(not d.es_aditivo for d in self.detalles)
        if not tiene_ingrediente:
            raise exceptions.AgregueIngredientes()
        return self

    @field_validator("fecha_creacion")
    @classmethod
    def validar_fecha_creacion(cls, v: Optional[datetime]) -> Optional[datetime]:
                    
        if v is not None:
            v_naive = v.replace(tzinfo=None) if v.tzinfo else v
            if v_naive.date() < date.today():
                raise exceptions.FechaAnterior()
        return v

    @field_validator("fecha_vigencia", "fecha_vencimiento")
    @classmethod
    def validar_fechas_version(cls, v: Optional[datetime]) -> Optional[datetime]:
            if v is not None:
                v_naive = v.replace(tzinfo=None) if v.tzinfo else v
                if v_naive.date() < date.today():
                    raise exceptions.FechaAnterior()
            return v


class Receta(RecetaBase):
    id: int
    activo: bool
    version_actual: Optional[VersionRecetaResponse] = None
    version_vigente: Optional[VersionRecetaResponse] = None
    detalles: Optional[List[RecetaDetalle]] = None

    model_config = ConfigDict(from_attributes=True)

class ChecklistRecetaGenerar(BaseModel):
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
        if v != date.today():
            raise exceptions.ChecklistFechaInvalida()
        return v


class CompletarEtapaSchema(BaseModel):
    observaciones: Optional[str] = None


class MarcarEtapaNoRealizadaSchema(BaseModel):
    motivo: str = Field(..., min_length=1, max_length=100)
    observacion: Optional[str] = None


class ChecklistRecetaItemResponse(BaseModel):
    id: int
    checklist_id: int
    receta_id: Optional[int] = None
    version_receta_id: Optional[int] = None
    nombre_receta: str
    detalle_id: Optional[int] = None
    nombre_etapa: str
    descripcion_pasos: str
    ingrediente_id: Optional[int] = None
    nombre_ingrediente: Optional[str] = None
    cantidad: float
    unidad_medida: str
    estado: EstadoEtapaRecetaItem
    responsable_legajo: Optional[int] = None
    nombre_responsable: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_hora_fin: Optional[datetime] = None
    motivo_no_realizado: Optional[str] = None
    observacion_no_realizado: Optional[str] = None
    fecha_hora_no_realizado: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChecklistRecetaResponse(BaseModel):
    id: int
    fecha: date
    creado_en: datetime
    activo: bool = True
    responsable_legajo: int
    nombre_responsable: Optional[str] = None
    estado: EstadoGeneralRecetaChecklist
    porcentaje_cumplimiento: float
    total_etapas: int
    etapas_completadas: int
    etapas_no_realizadas: int = 0
    etapas_pendientes: int
    etapas_vencidas: int = 0
    items: List[ChecklistRecetaItemResponse]

    model_config = ConfigDict(from_attributes=True)