from sqlalchemy import true
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
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
    # sin UNIQUE: el nombre se valida solo entre los activos (ver services.py),
    # asi un insumo dado de baja no impide cargar otro con el mismo nombre
    nombre: Mapped[str] = mapped_column(index=True)
    lote: Mapped[str] = mapped_column(index=True)
    fechaRecepcion: Mapped[datetime] = mapped_column(index=True)
    fechaVencimiento: Mapped[Optional[datetime]] = mapped_column(index=True)
    cantRecibida: Mapped[float] = mapped_column()
    stock: Mapped[float] = mapped_column()
    medida: Mapped[UnidadMedida] = mapped_column(index=True)
    # baja logica: un insumo usado en lotes de produccion no se puede borrar sin perder la trazabilidad
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())
