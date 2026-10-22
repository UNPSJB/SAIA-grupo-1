from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.insumos.models import UnidadMedida
from src.models import ModeloBase
from src.personal.models import Personal
from src.produccion.constants import NOMBRE_PRODUCTO_MAX


class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(NOMBRE_PRODUCTO_MAX))


# Un producto no puede repetirse aunque cambien las mayusculas ("Pan" y "pan" son el mismo).
Index("ix_productos_nombre_lower", func.lower(Producto.nombre), unique=True)


class LoteProduccion(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True)
    cantidad: Mapped[float] = mapped_column()
    unidad_medida: Mapped[UnidadMedida] = mapped_column()
    responsable_legajo: Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    producto: Mapped[Producto] = relationship(lazy="joined")
    responsable: Mapped[Personal] = relationship(lazy="joined")

    @property
    def nombre_responsable(self) -> str:
        return f"{self.responsable.nombre} {self.responsable.apellido}"
