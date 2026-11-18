from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.models import ModeloBase
from .constants import TipoQuimicoEnum


class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False, index=True)
    tipo = Column(SQLEnum(TipoQuimicoEnum), nullable=False)
    unidad_medida_id = Column(
        Integer, ForeignKey("unidades_medida.id"), nullable=False, index=True
    )
    stock_actual = Column(Float, default=0.0, nullable=False)
    proveedor = Column(String(150), nullable=True, default=None)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    unidad_medida_rel = relationship(
        "src.unidadesMedida.models.UnidadMedida", lazy="joined"
    )

    @property
    def unidad_medida(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.abreviatura
        return ""

    @property
    def unidad_medida_nombre(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre
        return ""
