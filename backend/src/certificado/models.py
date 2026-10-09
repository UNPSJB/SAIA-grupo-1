from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from typing import Optional
from datetime import datetime

class Certificado(ModeloBase):
    __tablename__ = "certificados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_tipo : Mapped[int] = mapped_column(Integer, ForeignKey("tipos_certificados.id"), nullable=False)
    fechaVencimiento: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)

    foto_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    legajo_persona: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), nullable=False)

    persona: Mapped["Personal"] = relationship(back_populates="certificados")

    tipo_relacion: Mapped["TipoCertificado"] = relationship(back_populates="certificados")