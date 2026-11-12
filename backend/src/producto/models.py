from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey, Boolean, Float
from src.models import ModeloBase
from enum import StrEnum, auto
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from src.insumos.models import UnidadMedida

if TYPE_CHECKING:
    from src.documentos.models import Documento
    from src.recetas.models import Receta

class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True, unique=True, nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unidadMedida: Mapped[UnidadMedida] = mapped_column(index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    visible_publico: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    id_receta: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documentos.id"), nullable=True, default=None)
    receta: Mapped[Optional["Documento"]] = relationship("Documento")

    receta_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("recetas.id"), nullable=True, default=None)
    receta_estructurada: Mapped[Optional["Receta"]] = relationship("Receta", foreign_keys=[receta_id])

    tamano_porcion_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    porciones_por_envase: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    descripcion_porcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
