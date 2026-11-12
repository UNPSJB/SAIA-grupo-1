from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, Integer, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.produccion.models import InsumoLote
    from src.proveedores.models import Proveedor
    from src.tipoInsumo.models import TipoInsumo
    from src.unidadesMedida.models import UnidadMedida


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    lote: Mapped[str] = mapped_column(String(50), index=True)
    fechaRecepcion: Mapped[datetime] = mapped_column()
    fechaVencimiento: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    cantRecibida: Mapped[float] = mapped_column()
    stock: Mapped[float] = mapped_column()
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False
    )
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())

    tipo_insumo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tipos_insumos.id"), index=True, nullable=True
    )
    proveedor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("proveedores.id"), index=True, nullable=True
    )

    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "src.unidadesMedida.models.UnidadMedida", lazy="joined"
    )
    tipo: Mapped[Optional["TipoInsumo"]] = relationship(
        "TipoInsumo", back_populates="insumos", lazy="joined"
    )
    proveedor: Mapped[Optional["Proveedor"]] = relationship(
        "Proveedor", back_populates="insumos", lazy="joined"
    )
    lotes_asociados: Mapped[List["InsumoLote"]] = relationship(
        "InsumoLote", back_populates="insumo"
    )

    @property
    def medida(self) -> str:
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
