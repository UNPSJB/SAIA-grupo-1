from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ParametroRedondeoNutricionalResponse(BaseModel):
    id: int
    nutriente: str
    nombre_mostrar: str
    unidad: str
    vdr: Optional[float] = None
    umbral_no_significativo: float
    cifras_decimales: int
    cifras_decimales_mayores_10: int
    texto_no_significativo: str
    orden: int
    activo: bool

    class Config:
        from_attributes = True

class ParametroRedondeoUpdate(BaseModel):
    nombre_mostrar: Optional[str] = None
    unidad: Optional[str] = None
    vdr: Optional[float] = None
    umbral_no_significativo: Optional[float] = None
    cifras_decimales: Optional[int] = None
    cifras_decimales_mayores_10: Optional[int] = None
    texto_no_significativo: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None

class InsumoNutricionalUpdate(BaseModel):
    energia_kcal: Optional[float] = None
    energia_kj: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio_mg: Optional[float] = None

class NutrienteFilaResponse(BaseModel):
    nutriente: str
    nombre_mostrar: str
    unidad: str
    valor_100g: float
    valor_100g_formateado: str
    valor_porcion: float
    valor_porcion_formateado: str
    vdr: Optional[float] = None
    vd_porcentaje: Optional[float] = None
    vd_formateado: str
    es_no_significativo: bool

class DetalleAporteIngrediente(BaseModel):
    ingrediente_id: int
    nombre_ingrediente: str
    cantidad_receta: float
    unidad_medida: str
    cantidad_gramos: float
    es_aditivo: bool
    aportes: Dict[str, float]

class InformacionNutricionalResponse(BaseModel):
    id: Optional[int] = None
    producto_id: int
    nombre_producto: str
    receta_id: int
    nombre_receta: str
    version_receta: Optional[int] = None
    tamano_porcion_g: float
    porciones_por_envase: Optional[float] = None
    descripcion_porcion: Optional[str] = None
    rendimiento_final_receta: float
    peso_total_ingredientes: float
    factor_rendimiento: float
    fecha_calculo: datetime
    calculado_por_usuario: Optional[str] = None
    tabla_nutricional: List[NutrienteFilaResponse]
    detalles_ingredientes: Optional[List[DetalleAporteIngrediente]] = None

class CalcularNutricionRequest(BaseModel):
    receta_id: Optional[int] = None
    tamano_porcion_g: Optional[float] = Field(None, gt=0)
    porciones_por_envase: Optional[float] = Field(None, gt=0)
    descripcion_porcion: Optional[str] = None

class VerificacionReferenciaDetalle(BaseModel):
    nutriente: str
    valor_calculado: float
    valor_esperado: float
    diferencia_absoluta: float
    diferencia_porcentual: float
    cumple_tolerancia: bool

class VerificacionReferenciaResponse(BaseModel):
    nombre_producto: str
    tolerancia_acordada_porcentaje: float
    resultado_global_valido: bool
    detalles_100g: List[VerificacionReferenciaDetalle]
    detalles_porcion: List[VerificacionReferenciaDetalle]
    mensaje: str
