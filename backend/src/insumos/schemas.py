from pydantic import BaseModel, ConfigDict, field_validator
from src.insumos.models import UnidadMedida
from src.insumos import exceptions



class InsumoBase(BaseModel):
    nombre: str
    lote: str
    fechaRecibido: datetime
    fechaVencimiento: Optional(datetime)
    cantRecibida: int
    stock: int
    medida: UnidadMedida

    @field_validator(
        "medida", mode="before"
    )
    @classmethod
    def is_valid_medida_insumo(cls, v: str) -> str:
        if v.lower() not in UnidadMedida:
            raise exceptions.UnidadMedidaInvalida(list(UnidadMedida))
        return v.lower()


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(InsumoBase):
    nombre: Optional[str] = None
    lote: Optional[str] = None
    fechaRecibido: Optional[datetime] = None
    fechaVencimiento: Optional[datetime] = None
    cantRecibida: Optional[float] = None
    stock: Optional[float] = None
    medida: Optional[UnidadMedida] = None
    
class InsumoUpdateStock(InsumoBase):
    stock = float


class Insumo(InsumoBase):
    id: int
    model_config = ConfigDict(from_attributes = True)


class InsumoDelete(InsumoBase):
    id: int
