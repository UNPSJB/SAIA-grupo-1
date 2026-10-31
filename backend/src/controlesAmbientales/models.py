from enum import Enum
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class TipoControlAmbiental(str, Enum):
    PLAGAS = "CONTROL_PLAGAS"
    AGUA = "ANALISIS_AGUA"
    TANQUE = "LIMPIEZA_TANQUE"

class ControlAmbiental(ModeloBase):
    __tablename__ = "controles_ambientales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tipo: Mapped[str] = mapped_column(String(100), index=True, nullable=False, unique=True)
    periodicidad_dias: Mapped[int] = mapped_column(Integer, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    ultima_fecha_realizacion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_vencimiento: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    
    observaciones: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    # Relación uno a muchos con el historial de visitas/ejecuciones
    visitas: Mapped[List["VisitaControlAmbiental"]] = relationship(
        "VisitaControlAmbiental",
        back_populates="control",
        cascade="all, delete-orphan",
        order_by="desc(VisitaControlAmbiental.fecha_realizacion)",
    )

    @property
    def ultima_visita(self) -> Optional["VisitaControlAmbiental"]:
        return self.visitas[0] if self.visitas else None


class VisitaControlAmbiental(ModeloBase):
    __tablename__ = "visitas_controles_ambientales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    control_id: Mapped[int] = mapped_column(Integer, ForeignKey("controles_ambientales.id"), nullable=False, index=True)
    
    fecha_realizacion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_proximo_vencimiento: Mapped[date] = mapped_column(Date, nullable=False) # Guardamos el vencimiento calculado en esta visita
    
    # Archivo/Comprobante de esta visita en particular
    certificado_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    observaciones: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    control: Mapped["ControlAmbiental"] = relationship("ControlAmbiental", back_populates="visitas")