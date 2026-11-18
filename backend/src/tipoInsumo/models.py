from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
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
    cantidad_referencia: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    equivalencia_gramos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    clase_funcional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    numero_ins: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
    es_aromatizante: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_edulcorante: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_cafeina: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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

    fuente_datos: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    fuente_detalle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    alimento_referencia_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    fecha_carga_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_carga_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    modificado_manualmente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_modificacion_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    usuario_modificacion_nutricional: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    valores_referencia_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)

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

    @property
    def tiene_datos_nutricionales(self) -> bool:
        return self.fuente_datos is not None or self.energia_kcal is not None


class Aditivo(ModeloBase):
    __tablename__ = "aditivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    clase_funcional: Mapped[str] = mapped_column(String(100), nullable=False)
    numero_ins: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default=None)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False
    )
    cantidad_referencia: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    equivalencia_gramos: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=1.0)
    es_aromatizante: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_edulcorante: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_cafeina: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aporta_energia_sodio: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    energia_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    energia_kj: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    sodio_mg: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    fuente_datos: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    fuente_detalle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

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
