from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.documentos.constants import TipoDocumento

class Documento(ModeloBase):
    __tablename__ = "documentos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    tipo: Mapped[TipoDocumento] = mapped_column(SQLEnum(TipoDocumento), index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    versiones: Mapped[List["VersionDocumento"]] = relationship(
        "VersionDocumento",
        back_populates="documento",
        cascade="all, delete-orphan",
        order_by="desc(VersionDocumento.id)",
    )

    @property
    def version_actual(self) -> Optional["VersionDocumento"]:
        for v in self.versiones:
            if not v.archivado:
                return v
        return self.versiones[0] if self.versiones else None

class VersionDocumento(ModeloBase):
    __tablename__ = "versiones_documento"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos.id"), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    archivo_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    archivo_nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tamanio_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    responsable_legajo: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True, nullable=False)
    archivado: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    documento: Mapped["Documento"] = relationship("Documento", back_populates="versiones")
    responsable: Mapped["src.personal.models.Personal"] = relationship("src.personal.models.Personal", lazy="joined")

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}".strip()
        return None
