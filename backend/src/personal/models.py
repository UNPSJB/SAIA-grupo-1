from typing import Optional, List
from pydantic import EmailStr
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum as SQLEnum
from src.models import ModeloBase
from src.personal.schemas import Capacidades


class Personal(ModeloBase):
    __tablename__ = "personal"

    legajo: Mapped[int] = mapped_column(primary_key=True, index=True)
    documento: Mapped[int] = mapped_column(unique=True,index=True)
    nombre: Mapped[str] = mapped_column(String(20),index=True)
    apellido: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    capacidad : Mapped[Capacidades] = mapped_column(SQLEnum(Capacidades), default=Capacidades.OPERAR, nullable=False)
