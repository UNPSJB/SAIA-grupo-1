from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

import src.unidadesMedida.models
import src.tipoInsumo.models
import src.proveedores.models

from src.unidadesMedida.models import UnidadMedida

if TYPE_CHECKING:
    from src.produccion.models import InsumoLote
    from src.proveedores.models import Proveedor
    from src.tipoInsumo.models import TipoInsumo

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

    energia_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    energia_kj: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    carbohidratos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    azucares_totales: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    azucares_anadidos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    proteinas: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_totales: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_saturadas: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    grasas_trans: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    fibra_alimentaria: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    sodio_mg: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)

    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    fuente_datos: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    fuente_detalle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    alimento_referencia_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)

    fecha_carga_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_carga_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)

    modificado_manualmente: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    fecha_modificacion_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_modificacion_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    valores_referencia_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)

    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "UnidadMedida", lazy="joined"
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

    @property
    def tiene_datos_nutricionales(self) -> bool:
        return self.fuente_datos is not None or self.energia_kcal is not None

    @tiene_datos_nutricionales.setter
    def tiene_datos_nutricionales(self, value: bool) -> None:
        pass

class AlimentoReferenciaSARA(ModeloBase):
    __tablename__ = "alimentos_referencia_sara"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    energia_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    energia_kj: Mapped[float] = mapped_column(Float, nullable=False)
    carbohidratos: Mapped[float] = mapped_column(Float, nullable=False)
    azucares_totales: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    azucares_anadidos: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    proteinas: Mapped[float] = mapped_column(Float, nullable=False)
    grasas_totales: Mapped[float] = mapped_column(Float, nullable=False)
    grasas_saturadas: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    grasas_trans: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fibra_alimentaria: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sodio_mg: Mapped[float] = mapped_column(Float, nullable=False)
    fuente: Mapped[str] = mapped_column(String(100), default="SARA 2 - Min. Salud de la Nación / Argenfoods", nullable=False)
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
