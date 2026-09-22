from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase
from sqlalchemy import String, FLOAT
from typing import Optional

class ElementoDeLimpieza(ModeloBase):
    __tablename__ = "elementos de limpieza"

    id : Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(20), index=True)
    frecuenciaDeCambio: Mapped[Optional[float]] = (FLOAT)
    #fechaIngreso: Mapped[datetime] = mapped_column() ver si va para verificar frecuencia de cambio TODO