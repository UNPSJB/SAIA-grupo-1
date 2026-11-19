from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from enum import auto, StrEnum
from src.models import ModeloBase
from sqlalchemy import Table, Column, Integer, ForeignKey
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.tipoInsumo.models import TipoInsumo

    
tipos_insumos_alergenos = Table(
    "tipos_insumos_alergenos",
    ModeloBase.metadata,
    Column("tipo_insumo_id", Integer, ForeignKey("tipos_insumos.id", ondelete="CASCADE"), primary_key=True),
    Column("alergeno_id", Integer, ForeignKey("alergenos.id", ondelete="CASCADE"), primary_key=True),
)

class Alergeno(ModeloBase):
    __tablename__ = "alergenos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str]
    simbolo: Mapped[str] = mapped_column(String(500))

    # Relación muchos a muchos con TipoInsumo
    tipos_insumos: Mapped[List["TipoInsumo"]] = relationship(
        "TipoInsumo", secondary=tipos_insumos_alergenos, back_populates="alergenos"
    )