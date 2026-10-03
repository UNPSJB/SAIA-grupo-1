from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from typing import Optional
from datetime import datetime

class Certificado(ModeloBase):
    __tablename__ = "certificados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tipo: Mapped[str] = mapped_column(String(30))
    fechaCreacion: Mapped[datetime] = mapped_column(DateTime)
    fechaVencimiento: Mapped[datetime] = mapped_column(DateTime, index=True)

    foto_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    id_persona: Mapped[int] = mapped_column(ForeignKey("personal.id"))

    persona: Mapped["Personal"] = relationship(back_populates="certificados")