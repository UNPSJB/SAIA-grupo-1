from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import List, Optional, Self
from src.insumos.models import UnidadMedida
from src.insumos import exceptions
from src.insumos.constants import FUENTES_VALIDAS, CAMPOS_NUTRICIONALES
from datetime import datetime, timedelta

class InsumoBase(BaseModel):
    nombre: str
    lote: str
    fechaRecepcion: datetime
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: float
    stock: float
    medida: UnidadMedida

    @field_validator("medida", mode="before")
    @classmethod
    def is_valid_medida_insumo(cls, v: str) -> str:
        if isinstance(v, UnidadMedida):
            return v
        if isinstance(v, str):
            val_upper = v.upper()
            if val_upper in UnidadMedida.__members__:
                return UnidadMedida[val_upper]
        raise exceptions.UnidadMedidaInvalida(list(UnidadMedida))

class InsumoCreate(InsumoBase):
    @field_validator("fechaRecepcion")
    @classmethod
    def validar_fecha_recepcion(cls, v: datetime) -> datetime:
        if v > datetime.now():
            raise exceptions.FechaRecepcionInvalida()
        return v

    @field_validator("fechaVencimiento")
    @classmethod
    def validar_fecha_vencimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            manana = (datetime.now() + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            if v < manana:
                raise exceptions.FechaVencimientoInvalida()
        return v

    @field_validator("cantRecibida")
    @classmethod
    def validar_mayores_a_cero(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.CantidadRecibidaInvalida()
        return v

    @field_validator("stock")
    @classmethod
    def validar_menor_a_cero(cls, v: float) -> float:
        if v < 0:
            raise exceptions.StockInvalido()
        return v

    @model_validator(mode="after")
    def validar_relacion_stock_cantidad(self) -> Self:
        if self.stock > self.cantRecibida:
            raise exceptions.StockMayorCantidad()
        return self

class InsumoUpdate(BaseModel):
    nombre: Optional[str] = None
    lote: Optional[str] = None
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: Optional[float] = None
    stock: Optional[float] = None
    medida: Optional[UnidadMedida] = None

    @field_validator("medida", mode="before")
    @classmethod
    def is_valid_medida_insumo(cls, v: Optional[str]) -> Optional[UnidadMedida]:
        if v is None:
            return None
        if isinstance(v, UnidadMedida):
            return v
        if isinstance(v, str):
            val_upper = v.upper()
            if val_upper in UnidadMedida.__members__:
                return UnidadMedida[val_upper]
        raise exceptions.UnidadMedidaInvalida(list(UnidadMedida))

    @field_validator("cantRecibida")
    @classmethod
    def validar_mayores_a_cero(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise exceptions.CantidadRecibidaInvalida()
        return v

    @field_validator("stock")
    @classmethod
    def validar_menor_a_cero(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise exceptions.StockInvalido()
        return v

    @model_validator(mode="after")
    def validar_relacion_stock_cantidad_update(self) -> Self:
        if self.stock is not None and self.cantRecibida is not None:
            if self.stock > self.cantRecibida:
                raise exceptions.StockMayorCantidad()
        return self

class InsumoUpdateStock(BaseModel):
    stock: float

    @field_validator("stock")
    @classmethod
    def validar_stock_mayor_a_cero(cls, v: float) -> float:
        if v <= 0:
            raise exceptions.StockInvalido()
        return v

class Insumo(InsumoBase):
    id: int
    es_aditivo: bool = False
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None
    alimento_referencia_id: Optional[str] = None
    modificado_manualmente: bool = False
    tiene_datos_nutricionales: bool = False
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

    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(BaseModel):
    id: int

class AlimentoReferenciaSARAResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    categoria: str
    energia_kcal: float
    energia_kj: float
    carbohidratos: float
    azucares_totales: float
    azucares_anadidos: float
    proteinas: float
    grasas_totales: float
    grasas_saturadas: float
    grasas_trans: float
    fibra_alimentaria: float
    sodio_mg: float
    fuente: str
    es_aditivo: bool

    model_config = ConfigDict(from_attributes=True)

class DatosNutricionalesInsumoUpdate(BaseModel):
    es_aditivo: bool = False
    fuente_datos: str
    fuente_detalle: Optional[str] = None
    alimento_referencia_id: Optional[str] = None
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

    @field_validator(
        "energia_kcal",
        "energia_kj",
        "carbohidratos",
        "azucares_totales",
        "azucares_anadidos",
        "proteinas",
        "grasas_totales",
        "grasas_saturadas",
        "grasas_trans",
        "fibra_alimentaria",
        "sodio_mg",
    )
    @classmethod
    def validar_no_negativo(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise exceptions.ValorNutricionalNegativo()
        return v

    @field_validator("fuente_datos")
    @classmethod
    def validar_fuente(cls, v: str) -> str:
        if not v or v.strip() not in FUENTES_VALIDAS:
            raise exceptions.FuenteNutricionalInvalida()
        return v.strip()

    @model_validator(mode="after")
    def validar_aditivo_y_requeridos(self) -> Self:
        if not self.es_aditivo:
            if (
                self.energia_kcal is None
                or self.carbohidratos is None
                or self.proteinas is None
                or self.grasas_totales is None
                or self.sodio_mg is None
            ):
                raise exceptions.DatosNutricionalesRequeridos()

            if self.azucares_totales is None:
                self.azucares_totales = 0.0
            if self.azucares_anadidos is None:
                self.azucares_anadidos = 0.0
            if self.grasas_saturadas is None:
                self.grasas_saturadas = 0.0
            if self.grasas_trans is None:
                self.grasas_trans = 0.0
            if self.fibra_alimentaria is None:
                self.fibra_alimentaria = 0.0

        if self.energia_kcal is not None and self.energia_kj is None:
            self.energia_kj = round(self.energia_kcal * 4.184, 1)
        elif self.energia_kj is not None and self.energia_kcal is None:
            self.energia_kcal = round(self.energia_kj / 4.184, 1)

        return self

class DatosNutricionalesInsumoResponse(BaseModel):
    insumo_id: int
    nombre_insumo: str
    es_aditivo: bool
    fuente_datos: Optional[str] = None
    fuente_detalle: Optional[str] = None
    alimento_referencia_id: Optional[str] = None
    fecha_carga_nutricional: Optional[datetime] = None
    usuario_carga_nutricional: Optional[str] = None
    modificado_manualmente: bool = False
    fecha_modificacion_nutricional: Optional[datetime] = None
    usuario_modificacion_nutricional: Optional[str] = None
    campos_modificados: List[str] = []
    valores_referencia: Optional[dict] = None
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
    tiene_datos_cargados: bool = False

    model_config = ConfigDict(from_attributes=True)
