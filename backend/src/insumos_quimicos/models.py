from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from src.models import ModeloBase
from .constants import TipoQuimicoEnum, UnidadMedidaEnum

class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False, index=True)
    tipo = Column(SQLEnum(TipoQuimicoEnum), nullable=False)
    unidad_medida = Column(SQLEnum(UnidadMedidaEnum), nullable=False)
    stock_actual = Column(Float, default=0.0, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())