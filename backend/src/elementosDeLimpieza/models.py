from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase
from sqlalchemy import String, Integer, Boolean, DateTime
from typing import Optional
from datetime import datetime

class ElementoDeLimpieza(ModeloBase):
    __tablename__ = "elementos de limpieza"

    id : Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(20), index=True)
    frecuenciaDeCambio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fechaCambio: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    