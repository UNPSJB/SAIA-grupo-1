from datetime import datetime
from typing import Optional
from sqlalchemy import Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.incidentes.constants import EstadoIncidente
from src.models import ModeloBase
from src.personal.models import Personal


class Incidente(ModeloBase):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    descripcion: Mapped[str] = mapped_column(Text)
    foto: Mapped[Optional[str]] = mapped_column(nullable=True)  # nombre del archivo en disco
    estado: Mapped[EstadoIncidente] = mapped_column(
        SQLEnum(EstadoIncidente), default=EstadoIncidente.PENDIENTE, index=True
    )
    creado_el: Mapped[datetime] = mapped_column(default=datetime.now, index=True)
    reportado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True)

    # Campos de cierre / acción correctiva (HDU #39)
    accion_correctiva: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cerrado_el: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    resuelto_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.legajo"), nullable=True, index=True)
    motivo_reapertura: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    reportado_por: Mapped[Personal] = relationship(foreign_keys=[reportado_por_id])
    resuelto_por: Mapped[Optional[Personal]] = relationship(foreign_keys=[resuelto_por_id])

    @property
    def nombre_reportante(self) -> str:
        return f"{self.reportado_por.nombre} {self.reportado_por.apellido}" if self.reportado_por else ""

    @property
    def nombre_resolutor(self) -> Optional[str]:
        return f"{self.resuelto_por.nombre} {self.resuelto_por.apellido}" if self.resuelto_por else None

    @property
    def foto_url(self) -> Optional[str]:
        return f"/incidentes/{self.id}/foto" if self.foto else None
