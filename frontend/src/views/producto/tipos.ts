export interface DocumentoReceta {
  id: number;
  titulo: string;
  tipo: string;
}

export interface Producto {
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  id_receta?: number | null;
  nombre_receta?: string | null;
  receta_id?: number | null;
  tamano_porcion_g?: number | null;
  porciones_por_envase?: number | null;
  descripcion_porcion?: string | null;
  activo: boolean;
  visible_publico?: boolean;
}

export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
}

export interface ProductoConId extends Producto {
  id: number;
}

export interface NutrienteFila {
  nutriente: string;
  nombre_mostrar: string;
  unidad: string;
  valor_100g: number;
  valor_100g_formateado: string;
  valor_porcion: number;
  valor_porcion_formateado: string;
  vdr?: number | null;
  vd_porcentaje?: number | null;
  vd_formateado: string;
  es_no_significativo: boolean;
}

export interface DetalleAporteIngrediente {
  ingrediente_id: number;
  nombre_ingrediente: string;
  cantidad_receta: number;
  unidad_medida: string;
  cantidad_gramos: number;
  es_aditivo: boolean;
  aportes: Record<string, number>;
}

export interface InformacionNutricional {
  id?: number;
  producto_id: number;
  nombre_producto: string;
  receta_id: number;
  nombre_receta: string;
  version_receta?: number | null;
  tamano_porcion_g: number;
  porciones_por_envase?: number | null;
  descripcion_porcion?: string | null;
  rendimiento_final_receta: number;
  peso_total_ingredientes: number;
  factor_rendimiento: number;
  fecha_calculo: string;
  calculado_por_usuario?: string | null;
  tabla_nutricional: NutrienteFila[];
  detalles_ingredientes?: DetalleAporteIngrediente[];
}

export interface ParametroRedondeo {
  id: number;
  nutriente: string;
  nombre_mostrar: string;
  unidad: string;
  vdr?: number | null;
  umbral_no_significativo: number;
  cifras_decimales: number;
  cifras_decimales_mayores_10: number;
  texto_no_significativo: string;
  orden: number;
  activo: boolean;
}

export interface VerificacionDetalleItem {
  nutriente: string;
  valor_calculado: number;
  valor_esperado: number;
  diferencia_absoluta: number;
  diferencia_porcentual: number;
  cumple_tolerancia: boolean;
}

export interface VerificacionReferencia {
  nombre_producto: string;
  tolerancia_acordada_porcentaje: number;
  resultado_global_valido: boolean;
  detalles_100g: VerificacionDetalleItem[];
  detalles_porcion: VerificacionDetalleItem[];
  mensaje: string;
}
