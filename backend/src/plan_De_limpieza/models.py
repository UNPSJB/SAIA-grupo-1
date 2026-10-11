from datetime import date
from typing import List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Plan_de_Limpieza(ModeloBase):
    __tablename__ = "plan_de_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True)
    fecha_inicio: Mapped[date] = mapped_column(index=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), unique=True, nullable=True)
    sector_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sectores.id"), unique=True, nullable=True)

    equipo: Mapped[Optional["src.equipos.models.Equipo"]] = relationship(
        "src.equipos.models.Equipo",
        back_populates="plan_de_Limpieza",
    )
    sector: Mapped[Optional["src.sectores.models.Sector"]] = relationship(
        "src.sectores.models.Sector",
        back_populates="plan_de_limpieza",
    )
    tareas: Mapped[List["src.tareas.models.Tarea"]] = relationship(
        "src.tareas.models.Tarea",
        back_populates="plan_de_limpieza",
    )

    @property
    def nombre_equipo(self) -> Optional[str]:
        return self.equipo.nombre if self.equipo else None

    @property
    def nombre_sector(self) -> Optional[str]:
        return self.sector.nombre if self.sector else None