from datetime import datetime
from enum import StrEnum
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.producto.models import Producto


class FormatoDeclaracionAditivos(StrEnum):
    INS_Y_NOMBRE = "ins_y_nombre"
    NOMBRE_E_INS = "nombre_e_ins"
    SOLO_INS = "solo_ins"
    SOLO_NOMBRE = "solo_nombre"


class ListaIngredientesRotulo(ModeloBase):
    __tablename__ = "listas_ingredientes_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), unique=True, index=True
    )
    formato_aditivos: Mapped[FormatoDeclaracionAditivos] = mapped_column(
        default=FormatoDeclaracionAditivos.INS_Y_NOMBRE
    )
    ajustado_manualmente: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_ajuste_manual: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, default=None
    )
    usuario_ajuste_manual: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default=None
    )
    texto_rotulo: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, default=None
    )
    actualizado_el: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )

    producto: Mapped[Producto] = relationship(lazy="joined")
    items: Mapped[List["ItemIngredienteRotulo"]] = relationship(
        back_populates="lista",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ItemIngredienteRotulo.orden",
    )


class ItemIngredienteRotulo(ModeloBase):
    __tablename__ = "items_ingredientes_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lista_id: Mapped[int] = mapped_column(
        ForeignKey("listas_ingredientes_rotulo.id", ondelete="CASCADE"), index=True
    )
    orden: Mapped[int] = mapped_column(Integer, index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    denominacion_rotulo: Mapped[str] = mapped_column(String(150))
    porcentaje: Mapped[float] = mapped_column(Float)
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False)
    funcion: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True, default=None
    )
    numero_ins: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default=None
    )
    es_aromatizante: Mapped[bool] = mapped_column(Boolean, default=False)
    texto_declaracion: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )

    lista: Mapped[ListaIngredientesRotulo] = relationship(back_populates="items")

