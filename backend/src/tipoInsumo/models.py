from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.alergenos.models import Alergeno
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.insumos.models import Insumo
    from src.unidadesMedida.models import UnidadMedida


class TipoInsumo(ModeloBase):
    __tablename__ = "tipos_insumos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "src.unidadesMedida.models.UnidadMedida", lazy="joined"
    )
    insumos: Mapped[List["Insumo"]] = relationship(
        "src.insumos.models.Insumo", back_populates="tipo"
    )

    alergeno_id: Mapped[int]= mapped_column(Integer, ForeignKey("alergenos.id"), index=True, nullable=False
        )

    alergeno:Mapped[List["Alergeno"]] =  relationship("Alergeno", back_populates="T_insumo")

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

    @property
    def nombre_alergeno(self):
        return self.alergeno.nombre
