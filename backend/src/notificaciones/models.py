from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class Notificacion(ModeloBase):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo", ondelete="CASCADE"), index=True
    )
    titulo: Mapped[str] = mapped_column(String(150), index=True)
    mensaje: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(String(50), index=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    leida: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    leida_el: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    entidad_tipo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entidad_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    clave_duplicado: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, index=True)

    usuario: Mapped["src.personal.models.Personal"] = relationship(lazy="joined")

