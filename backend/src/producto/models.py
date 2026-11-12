from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.gestion_archivos.models import Documento
    from src.unidadesMedida.models import UnidadMedida


class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True, unique=True, nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    visible_publico: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    id_receta: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documentos.id"), nullable=True, default=None
    )
    receta: Mapped[Optional["Documento"]] = relationship("Documento")
    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "src.unidadesMedida.models.UnidadMedida", lazy="joined"
    )

    @property
    def unidadMedida(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre.lower()
        return ""

    @property
    def unidad_medida_nombre(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre
        return ""

    @property
    def unidad_medida_abreviatura(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.abreviatura
        return ""
