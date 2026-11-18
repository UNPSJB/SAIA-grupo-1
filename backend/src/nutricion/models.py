from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class ParametroRedondeoNutricional(ModeloBase):
    __tablename__ = "parametros_redondeo_nutricional"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nutriente: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre_mostrar: Mapped[str] = mapped_column(String(100), nullable=False)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False)
    vdr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    umbral_no_significativo: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cifras_decimales: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cifras_decimales_mayores_10: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    texto_no_significativo: Mapped[str] = mapped_column(String(20), default="0", nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class InformacionNutricionalProducto(ModeloBase):
    __tablename__ = "informacion_nutricional_productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(Integer, ForeignKey("productos.id"), unique=True, index=True, nullable=False)
    receta_id: Mapped[int] = mapped_column(Integer, ForeignKey("recetas.id"), index=True, nullable=False)
    version_receta_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tamano_porcion_g: Mapped[float] = mapped_column(Float, nullable=False)
    porciones_por_envase: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    descripcion_porcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rendimiento_final_receta: Mapped[float] = mapped_column(Float, nullable=False)
    peso_total_ingredientes: Mapped[float] = mapped_column(Float, nullable=False)
    factor_rendimiento: Mapped[float] = mapped_column(Float, nullable=False)
    fecha_calculo: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    calculado_por_usuario: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    detalles_ingredientes_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valores_nutricionales_json: Mapped[str] = mapped_column(Text, nullable=False)

    energia_kcal_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energia_kcal_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energia_kcal_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    energia_kj_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energia_kj_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energia_kj_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    carbohidratos_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbohidratos_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbohidratos_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    azucares_totales_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    azucares_totales_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    azucares_totales_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    azucares_anadidos_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    azucares_anadidos_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    azucares_anadidos_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    proteinas_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    proteinas_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    proteinas_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    grasas_totales_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_totales_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_totales_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    grasas_saturadas_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_saturadas_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_saturadas_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    grasas_trans_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_trans_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grasas_trans_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    fibra_alimentaria_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fibra_alimentaria_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fibra_alimentaria_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    sodio_mg_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sodio_mg_porcion: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sodio_mg_vd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
