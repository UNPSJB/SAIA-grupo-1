from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Enum as SQLEnum
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
        foreign_keys="[VersionDocumento.documento_id]",
        cascade="all, delete-orphan",
        order_by="desc(VersionDocumento.id)",
    )

    @property
    def version_vigente(self) -> Optional["VersionDocumento"]:
        for v in self.versiones:
            if v.es_vigente:
                return v
        for v in self.versiones:
            if not v.archivado:
                return v
        return self.versiones[0] if self.versiones else None

    @property
    def version_actual(self) -> Optional["VersionDocumento"]:
        return self.version_vigente

class VersionDocumento(ModeloBase):
    __tablename__ = "versiones_documento"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos.id"), index=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    archivo_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    archivo_nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tamanio_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    archivado: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    es_vigente: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    fecha_vigencia: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    documento: Mapped["Documento"] = relationship(
        "Documento",
        back_populates="versiones",
        foreign_keys=[documento_id],
    )

