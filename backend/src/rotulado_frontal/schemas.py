from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.rotulado_frontal.constants import (
    Comparador, EstadoConjunto, EstadoFisico, Nutriente, TipoCondicion,
)


def _texto_obligatorio(valor: str) -> str:
    limpio = " ".join(valor.split())
    if not limpio:
        raise ValueError("El campo no puede estar vacío")
    return limpio


# --- Reglas ---

class CondicionUmbral(BaseModel):
    tipo: TipoCondicion
    nutriente: Nutriente
    # kcal por gramo del nutriente (4 para azucares, 9 para grasas); solo en PORCENTAJE_ENERGIA
    factor_kcal: Optional[float] = Field(default=None, gt=0)
    comparador: Comparador = Comparador.MAYOR_IGUAL
    umbral: float = Field(ge=0)
    # None: la condicion aplica a solidos y liquidos
    estado_fisico: Optional[EstadoFisico] = None

    @model_validator(mode="after")
    def validar_formula(self) -> "CondicionUmbral":
        if self.tipo in (TipoCondicion.PORCENTAJE_ENERGIA, TipoCondicion.MG_POR_KCAL) \
                and self.nutriente == Nutriente.ENERGIA_KCAL:
            raise ValueError("La energía no puede compararse contra sí misma")
        if self.tipo == TipoCondicion.PORCENTAJE_ENERGIA and self.factor_kcal is None:
            raise ValueError("Una condición PORCENTAJE_ENERGIA requiere factor_kcal")
        if self.tipo != TipoCondicion.PORCENTAJE_ENERGIA:
            self.factor_kcal = None
        return self


class CondicionAplicabilidad(BaseModel):
    campo: Nutriente
    comparador: Comparador
    valor: float


class ReglaIn(BaseModel):
    codigo: str = Field(min_length=1, max_length=40)
    leyenda: str = Field(min_length=1, max_length=60)
    condiciones: List[CondicionUmbral] = Field(min_length=1)
    aplicabilidad: List[CondicionAplicabilidad] = Field(default_factory=list)
    orden: int = 0
    activa: bool = True

    @field_validator("codigo")
    @classmethod
    def normalizar_codigo(cls, v: str) -> str:
        return "_".join(_texto_obligatorio(v).upper().split())

    @field_validator("leyenda")
    @classmethod
    def validar_leyenda(cls, v: str) -> str:
        return _texto_obligatorio(v)


class ReglaOut(ReglaIn):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Conjuntos de parametros ---

class ConjuntoBase(BaseModel):
    version: str = Field(min_length=1, max_length=20)
    fecha_vigencia: date
    norma_origen: str = Field(min_length=3, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=500)

    @field_validator("version", "norma_origen")
    @classmethod
    def validar_obligatorios(cls, v: str) -> str:
        return _texto_obligatorio(v)

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = " ".join(v.split())
        return limpio or None


class ConjuntoCreate(ConjuntoBase):
    reglas: List[ReglaIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def validar_codigos_unicos(self) -> "ConjuntoCreate":
        codigos = [r.codigo for r in self.reglas]
        if len(codigos) != len(set(codigos)):
            raise ValueError("Hay reglas con el mismo código dentro del conjunto")
        return self


class ConjuntoUpdate(ConjuntoCreate):
    """El PUT reemplaza el borrador completo, reglas incluidas."""


class NuevaVersionIn(ConjuntoBase):
    """Datos de la version nueva; las reglas se copian del conjunto de origen."""


class ConjuntoResumen(ConjuntoBase):
    id: int
    estado: EstadoConjunto
    basado_en_id: Optional[int] = None
    creado_en: datetime
    publicado_en: Optional[datetime] = None
    es_vigente: bool = False
    cantidad_calculos: int = 0
    model_config = ConfigDict(from_attributes=True)


class ConjuntoResponse(ConjuntoResumen):
    reglas: List[ReglaOut] = Field(default_factory=list)


# --- Interruptor del modulo ---

class EstadoModuloOut(BaseModel):
    clave: str
    activo: bool
    actualizado_en: Optional[datetime] = None
    actualizado_por_legajo: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class EstadoModuloIn(BaseModel):
    activo: bool


# --- Calculo ---

class ValoresNutricionales100(BaseModel):
    """Valores cada 100 g o 100 ml del producto terminado."""
    energia_kcal: float = Field(ge=0)
    azucares_anadidos: float = Field(ge=0)
    grasas_totales: float = Field(ge=0)
    grasas_saturadas: float = Field(ge=0)
    sodio_mg: float = Field(ge=0)


class CalculoIn(BaseModel):
    valores: ValoresNutricionales100
    # si no se indica, se deduce de la unidad de medida del producto
    estado_fisico: Optional[EstadoFisico] = None


class EvaluacionIn(BaseModel):
    valores: ValoresNutricionales100
    estado_fisico: EstadoFisico
    # sin conjunto se usa el vigente; con conjunto se puede probar un borrador antes de publicarlo
    conjunto_id: Optional[int] = None


class DetalleCondicion(BaseModel):
    condicion: CondicionUmbral
    valor_calculado: Optional[float] = None
    # False cuando no corresponde al estado fisico del producto
    evaluada: bool = True
    cumple: bool = False


class ResultadoRegla(BaseModel):
    codigo: str
    leyenda: str
    aplica: bool
    supera: bool
    condiciones: List[DetalleCondicion] = Field(default_factory=list)


class EvaluacionOut(BaseModel):
    conjunto_parametros_id: int
    version_parametros: str
    sellos: List[str]
    detalle: List[ResultadoRegla]


class CalculoOut(BaseModel):
    id: int
    producto_id: int
    conjunto_parametros_id: int
    version_parametros: str
    norma_origen: str
    fecha_vigencia_parametros: date
    estado_fisico: EstadoFisico
    valores_entrada: ValoresNutricionales100
    sellos: List[str]
    detalle: List[ResultadoRegla] = Field(validation_alias="resultado")
    calculado_en: datetime
    calculado_por_legajo: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
