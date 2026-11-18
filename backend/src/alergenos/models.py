from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from enum import auto, StrEnum
from src.models import ModeloBase
from src.tipoInsumo.models import TipoInsumo




class Alergeno(ModeloBase):
    __tablename__="alergenos"

    id:Mapped[int] = mapped_column(primary_key=True,index=True)
    nombre:Mapped[str]
    simbolo:Mapped[str] = mapped_column(String(500))

    t_insumo: Mapped[Optional["TipoInsumo"]]=relationship("TipoInsumo",back_populates="alergeno")