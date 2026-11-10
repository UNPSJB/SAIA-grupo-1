from sqlalchemy import ForeignKey, true
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from enum import auto, StrEnum
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.tipoInsumo.models import TipoInsumo
    from src.proveedores.models import Proveedor
    from src.produccion.models import InsumoLote

class UnidadMedida(StrEnum):
    KILOGRAMOS = auto()
    GRAMOS = auto()
    LITROS = auto()
    MILILITROS = auto()
    UNIDADES = auto()



class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # sin UNIQUE: el nombre se valida solo entre los activos (ver services.py),
    # asi un insumo dado de baja no impide cargar otro con el mismo nombre
    nombre: Mapped[str] = mapped_column(index=True)
    lote: Mapped[str] = mapped_column(index=True)
    fechaRecepcion: Mapped[datetime] = mapped_column(index=True)
    fechaVencimiento: Mapped[Optional[datetime]] = mapped_column(index=True)
    cantRecibida: Mapped[float] = mapped_column()
    stock: Mapped[float] = mapped_column()
    medida: Mapped[UnidadMedida] = mapped_column(index=True)
    # baja logica: un insumo usado en lotes de produccion no se puede borrar sin perder la trazabilidad
    activo: Mapped[bool] = mapped_column(default=True, server_default=true())

    tipo_insumo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tipos_insumos.id"), index=True, nullable=True)
    proveedor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("proveedores.id"), index=True, nullable=True)

    tipo: Mapped[Optional["TipoInsumo"]] = relationship("TipoInsumo", back_populates="insumos", lazy="joined")
    proveedor: Mapped[Optional["Proveedor"]] = relationship("Proveedor", back_populates="insumos", lazy="joined")
    lotes_asociados: Mapped[List["InsumoLote"]] = relationship("InsumoLote", back_populates="insumo")
