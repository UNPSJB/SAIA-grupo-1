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


class BorradorRotulo(ModeloBase):
    __tablename__ = "borradores_rotulo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), unique=True, index=True
    )
    denominacion_venta: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, default=None
    )
    contenido_neto: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default=None
    )
    rnpa_rppa: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True, default=None
    )
    rne: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True, default=None
    )
    razon_social: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True, default=None
    )
    direccion_origen: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, default=None
    )
    pais_origen: Mapped[str] = mapped_column(
        String(80), default="Industria Argentina"
    )
    lote: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default=None
    )
    fecha_duracion: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default=None
    )
    instrucciones_conservacion: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )
    modo_empleo: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )

    porcion: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True, default=None
    )
    porciones_por_envase: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default=None
    )
    valor_energetico_kcal: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    valor_energetico_kj: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    carbohidratos: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    azucares_totales: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    azucares_anadidos: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    proteinas: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    grasas_totales: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    grasas_saturadas: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    grasas_trans: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    fibra_alimentaria: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    sodio: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, default=None
    )
    tabla_marcada_incompleta: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    tiene_exceso_azucares: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    tiene_exceso_sodio: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    tiene_exceso_grasas_saturadas: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    tiene_exceso_grasas_totales: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    tiene_exceso_calorias: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    contiene_edulcorantes: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    contiene_cafeina: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    modo_calculo_octogonos: Mapped[str] = mapped_column(
        String(20), default="automatico"
    )

    actualizado_el: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )
    usuario_actualizacion: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default=None
    )

    producto: Mapped[Producto] = relationship(lazy="joined")


