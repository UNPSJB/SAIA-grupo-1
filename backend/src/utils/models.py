from datetime import datetime
from enum import StrEnum, auto
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase





class PD_EFE(ModeloBase):
    __tablename__="pdFs"

    id:Mapped[int] = mapped_column(primary_key=True,index=True)
    encabezado:Mapped[str] = mapped_column(index=True)
    logo: Mapped[str]= mapped_column(String(200), index=True)
    pie_dePagina:Mapped[str]= mapped_column(index=True)
    tipo_letra:Mapped[str] = mapped_column(String(100))
  