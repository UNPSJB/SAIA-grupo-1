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

    reportado_por: Mapped[Personal] = relationship()

    @property
    def nombre_reportante(self) -> str:
        return f"{self.reportado_por.nombre} {self.reportado_por.apellido}"

    @property
    def foto_url(self) -> Optional[str]:
        return f"/incidentes/{self.id}/foto" if self.foto else None
