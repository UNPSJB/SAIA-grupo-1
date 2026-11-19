from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.tipoInsumo import exceptions

class AlergenoSimple(BaseModel):
    id: int
    nombre: str
    simbolo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TipoInsumoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    cantidad_referencia: float = 1.0
    equivalencia_gramos: Optional[float] = None
    es_aditivo: bool = False
    clase_funcional: Optional[str] = None
    numero_ins: Optional[str] = None
    es_aromatizante: bool = False
    es_edulcorante: bool = False
    es_cafeina: bool = False
    energia_kcal: Optional[float] = None
    energia_kj: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio_mg: Optional[float] = None
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None
    alimento_referencia_id: Optional[str] = None
    alergenos: List[AlergenoSimple] = []
    nombres_alergenos: str = ""

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if v is None or not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class TipoInsumoCreate(TipoInsumoBase):
    alergeno_ids: Optional[List[int]] = []


class TipoInsumoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    cantidad_referencia: Optional[float] = None
    equivalencia_gramos: Optional[float] = None
    es_aditivo: Optional[bool] = None
    clase_funcional: Optional[str] = None
    numero_ins: Optional[str] = None
    es_aromatizante: Optional[bool] = None
    es_edulcorante: Optional[bool] = None
    es_cafeina: Optional[bool] = None
    energia_kcal: Optional[float] = None
    energia_kj: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio_mg: Optional[float] = None
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None
    alimento_referencia_id: Optional[str] = None
    activo: Optional[bool] = None
    alergeno_ids: Optional[List[int]] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise exceptions.NombreVacio()
        limpio = " ".join(v.strip().split())
        if len(limpio) < 2:
            raise exceptions.NombreCorto()
        return limpio

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip()
        return limpio if limpio else None


class LoteInsumoHistorico(BaseModel):
    id: int
    lote: str
    nombre: str
    stock: float
    cantRecibida: float
    medida: str
    fechaRecepcion: datetime | date
    fechaVencimiento: Optional[datetime | date] = None
    proveedor_id: Optional[int] = None
    proveedor_nombre: Optional[str] = None
    estadoVencimiento: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class TipoInsumo(TipoInsumoBase):
    id: int
    unidad_medida_id: int
    unidadMedida: str
    unidad_medida_nombre: Optional[str] = None
    unidad_medida_abreviatura: Optional[str] = None
    tiene_datos_nutricionales: bool = False
    modificado_manualmente: bool = False
    activo: bool = True
    total_lotes: int = 0
    cantidad_lotes: int = 0
    stock_total: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class TipoInsumoDetalle(TipoInsumo):
    lotes: List[LoteInsumoHistorico] = []
    lotes_historicos: List[LoteInsumoHistorico] = []


class AditivoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    clase_funcional: str = Field(..., max_length=100)
    numero_ins: Optional[str] = Field(default=None, max_length=30)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    cantidad_referencia: float = 1.0
    equivalencia_gramos: Optional[float] = 1.0
    es_aromatizante: bool = False
    es_edulcorante: bool = False
    es_cafeina: bool = False
    aporta_energia_sodio: bool = False
    energia_kcal: Optional[float] = None
    energia_kj: Optional[float] = None
    sodio_mg: Optional[float] = None
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None


class AditivoCreate(AditivoBase):
    pass


class AditivoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    clase_funcional: Optional[str] = Field(default=None, max_length=100)
    numero_ins: Optional[str] = Field(default=None, max_length=30)
    unidad_medida_id: Optional[int] = None
    unidadMedida: Optional[str] = None
    cantidad_referencia: Optional[float] = None
    equivalencia_gramos: Optional[float] = None
    es_aromatizante: Optional[bool] = None
    es_edulcorante: Optional[bool] = None
    es_cafeina: Optional[bool] = None
    aporta_energia_sodio: Optional[bool] = None
    energia_kcal: Optional[float] = None
    energia_kj: Optional[float] = None
    sodio_mg: Optional[float] = None
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None
    activo: Optional[bool] = None


class AditivoResponse(AditivoBase):
    id: int
    unidad_medida_id: int
    unidadMedida: str
    unidad_medida_nombre: Optional[str] = None
    unidad_medida_abreviatura: Optional[str] = None
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)
