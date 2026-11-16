from sqlalchemy import true, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
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

    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    fuente_datos: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    fuente_detalle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    alimento_referencia_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)

    fecha_carga_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_carga_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)

    modificado_manualmente: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    fecha_modificacion_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_modificacion_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    valores_referencia_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)

class AlimentoReferenciaSARA(ModeloBase):
    __tablename__ = "alimentos_referencia_sara"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    energia_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    energia_kj: Mapped[float] = mapped_column(Float, nullable=False)
    carbohidratos: Mapped[float] = mapped_column(Float, nullable=False)
    azucares_totales: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    azucares_anadidos: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    proteinas: Mapped[float] = mapped_column(Float, nullable=False)
    grasas_totales: Mapped[float] = mapped_column(Float, nullable=False)
    grasas_saturadas: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    grasas_trans: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fibra_alimentaria: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sodio_mg: Mapped[float] = mapped_column(Float, nullable=False)
    fuente: Mapped[str] = mapped_column(String(100), default="SARA 2 - Min. Salud de la Nación / Argenfoods", nullable=False)
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
