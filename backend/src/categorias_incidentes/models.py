from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.incidentes.models import Incidente


class CategoriaIncidente(ModeloBase):
    __tablename__ = "categorias_incidentes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    incidentes: Mapped[List["Incidente"]] = relationship("src.incidentes.models.Incidente", back_populates="categoria_rel")
