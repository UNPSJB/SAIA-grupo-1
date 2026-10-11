from typing import List, Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Sector(ModeloBase):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, index=True)

    equipos: Mapped[List["src.equipos.models.Equipo"]] = relationship(
        "src.equipos.models.Equipo",
        back_populates="ubicacion",
    )
    plan_de_limpieza: Mapped[Optional["src.plan_De_limpieza.models.Plan_de_Limpieza"]] = relationship(
        "src.plan_De_limpieza.models.Plan_de_Limpieza",
        back_populates="sector",
        uselist=False,
    )

