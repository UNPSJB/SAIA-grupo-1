from sqlalchemy import true, Float
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
    nombre: Mapped[str] = mapped_column(index=True)
    lote: Mapped[str] = mapped_column(index=True)
    fechaRecepcion: Mapped[datetime] = mapped_column(index=True)
    fechaVencimiento: Mapped[Optional[datetime]] = mapped_column(index=True)
    cantRecibida: Mapped[float] = mapped_column()
    stock: Mapped[float] = mapped_column()
    medida: Mapped[UnidadMedida] = mapped_column(index=True)
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())

    energia_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    energia_kj: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    carbohidratos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    azucares_totales: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    azucares_anadidos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    proteinas: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_totales: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_saturadas: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_trans: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    fibra_alimentaria: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    sodio_mg: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
