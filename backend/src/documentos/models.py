from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.documentos.constants import TipoDocumento
from src.personal.models import Personal

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
    fecha_archivo: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    creado_por_legajo: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.legajo"), nullable=True, index=True)
    creado_por_usuario: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    documento: Mapped["Documento"] = relationship(
        "Documento",
        back_populates="versiones",
        foreign_keys=[documento_id],
    )
    creado_por: Mapped[Optional["Personal"]] = relationship(
        "Personal",
        foreign_keys=[creado_por_legajo],
    )

    @property
    def usuario(self) -> str:
        if self.creado_por:
            u = getattr(self.creado_por, "usuario", None)
            if u:
                return u
            return f"{self.creado_por.nombre} {self.creado_por.apellido}".strip()
        if self.creado_por_usuario:
            return self.creado_por_usuario
        return "admin"

    @property
    def tamanio_formateado(self) -> str:
        if self.tamanio_bytes < 1024:
            return f"{self.tamanio_bytes} B"
        elif self.tamanio_bytes < 1024 * 1024:
            return f"{self.tamanio_bytes / 1024:.1f} KB"
        return f"{self.tamanio_bytes / (1024 * 1024):.2f} MB"
