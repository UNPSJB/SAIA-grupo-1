from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.incidentes.constants import ETIQUETAS_TIPO, EstadoIncidente, TipoIncidente
from src.models import ModeloBase
from src.personal.models import Personal

if TYPE_CHECKING:
    from src.categorias_incidentes.models import CategoriaIncidente


class Incidente(ModeloBase):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    descripcion: Mapped[str] = mapped_column(Text)
    tipo: Mapped[TipoIncidente] = mapped_column(
        SQLEnum(TipoIncidente), default=TipoIncidente.OTRO, nullable=False, index=True
    )
    foto: Mapped[Optional[str]] = mapped_column(nullable=True)
    estado: Mapped[EstadoIncidente] = mapped_column(
        SQLEnum(EstadoIncidente), default=EstadoIncidente.PENDIENTE, index=True
    )
    creado_el: Mapped[datetime] = mapped_column(default=datetime.now, index=True)
    reportado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True)

    accion_correctiva: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cerrado_el: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    resuelto_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.legajo"), nullable=True, index=True)
    motivo_reapertura: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categorias_incidentes.id"), nullable=True, index=True)

    reportado_por: Mapped[Personal] = relationship(foreign_keys=[reportado_por_id])
    resuelto_por: Mapped[Optional[Personal]] = relationship(foreign_keys=[resuelto_por_id])
    categoria_rel: Mapped[Optional["CategoriaIncidente"]] = relationship(
        "src.categorias_incidentes.models.CategoriaIncidente", back_populates="incidentes"
    )

    @property
    def nombre_reportante(self) -> str:
        return f"{self.reportado_por.nombre} {self.reportado_por.apellido}" if self.reportado_por else ""

    @property
    def nombre_resolutor(self) -> Optional[str]:
        return f"{self.resuelto_por.nombre} {self.resuelto_por.apellido}" if self.resuelto_por else None

    @property
    def foto_url(self) -> Optional[str]:
        return f"/incidentes/{self.id}/foto" if self.foto else None

    @property
    def nombre_tipo(self) -> str:
        return ETIQUETAS_TIPO.get(self.tipo, str(self.tipo).capitalize())

    @property
    def categoria_nombre(self) -> str:
        if self.categoria_rel:
            return self.categoria_rel.nombre
        return self.nombre_tipo

