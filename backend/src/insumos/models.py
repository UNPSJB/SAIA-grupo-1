from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import auto, StrEnum
from src.models import ModeloBase

class UnidadMedida(StrEnum):
    KILOGRAMOS = auto()
    GRAMOS = auto()
    LITROS = auto()
    MILILITROS = auto()
    UNIDADES = auto()



class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True, unique=True, required=True)
    lote: Mapped[str] = mapped_column(index=True, required=True)
    fechaRecepcion: Mapped[datetime] = mapped_column(index=True, required=True)
    fechaVencimiento: Optional[datetime] = mapped_column(index=True)
    cantInicial: Mapped[float] = mapped_column()
    stock: Mapped[float] = mapped_column()
    medida: Mapped[UnidadMedida] = mapped_column(index=True, required=True)  
