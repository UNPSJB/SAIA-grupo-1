from datetime import date, datetime
from typing import List
from sqlalchemy import Date, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.insumos.models import Insumo, UnidadMedida
from src.models import ModeloBase
from src.personal.models import Personal
from src.produccion.constants import NOMBRE_PRODUCTO_MAX


class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(NOMBRE_PRODUCTO_MAX))
    # en qué se mide lo que se produce: todos los lotes del producto usan esta unidad
    unidad_medida: Mapped[UnidadMedida] = mapped_column()


# Un producto no puede repetirse aunque cambien las mayusculas ("Pan" y "pan" son el mismo).
Index("ix_productos_nombre_lower", func.lower(Producto.nombre), unique=True)


class LoteProduccion(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True)
    # cantidad producida, en la unidad de medida del producto. No se edita una vez registrada.
    cantidad: Mapped[float] = mapped_column()
    responsable_legajo: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    producto: Mapped[Producto] = relationship(lazy="joined")
    responsable: Mapped[Personal] = relationship(lazy="joined")
    insumos: Mapped[List["InsumoLote"]] = relationship(
        back_populates="lote", cascade="all, delete-orphan", lazy="selectin", order_by="InsumoLote.id"
    )

    @property
    def nombre_responsable(self) -> str:
        return f"{self.responsable.nombre} {self.responsable.apellido}"

    @property
    def editable(self) -> bool:
        """Solo se le pueden agregar o quitar insumos el mismo día del lote; después queda de solo lectura."""
        return self.fecha >= date.today()


class InsumoLote(ModeloBase):
    """Cuánto se usó de un insumo del maestro en un lote, en la unidad de medida del insumo."""

    __tablename__ = "insumos_lote"
    # el mismo insumo no puede asociarse dos veces al mismo lote
    __table_args__ = (UniqueConstraint("lote_id", "insumo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lote_id: Mapped[int] = mapped_column(ForeignKey("lotes_produccion.id", ondelete="CASCADE"), index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True)
    cantidad: Mapped[float] = mapped_column()

    lote: Mapped[LoteProduccion] = relationship(back_populates="insumos")
    insumo: Mapped[Insumo] = relationship(lazy="joined")
