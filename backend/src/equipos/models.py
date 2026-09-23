from enum import StrEnum, auto
from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Categoria (StrEnum):
    CONSERVAMIENTO = auto()
    SANAMIENTO = auto()
    MANTENIMIENTO = auto()
    DESINFECCION = auto() 


class Estado(StrEnum):
    ACTIVO= auto()
    INACTIVO=auto()

class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(20), index=True)
    categoria: Mapped[Categoria] = mapped_column(index=True)
    ubicacion: Mapped[str] = mapped_column(String(50))
    plan_de_calibracion: Mapped[str] = mapped_column(String(100))
    estado: Mapped[Estado] = mapped_column(index=True)

    plan_de_Limpieza: Mapped[Optional["src.plan_De_limpieza.models.Plan_de_Limpieza"]]= relationship("src.plan_De_limpieza.models.Plan_de_Limpieza",back_populates="equipo",uselist=False)
    