from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.insumos.models import UnidadMedida

if TYPE_CHECKING:
    from src.insumos.models import Insumo


class TipoInsumo(ModeloBase):
    __tablename__ = "tipos_insumos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unidadMedida: Mapped[UnidadMedida] = mapped_column(index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    insumos: Mapped[List["Insumo"]] = relationship("src.insumos.models.Insumo", back_populates="tipo")
