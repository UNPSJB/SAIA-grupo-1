from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase



class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(20), index=True)
    categoria: Mapped[str] = mapped_column(String(20))
    ubicacion: Mapped[str] = mapped_column(String(50))
    plan_de_Limpieza: Mapped[str] = mapped_column(String(100))
    plan_de_calibracion: Mapped[str] = mapped_column(String(100))