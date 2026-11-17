export interface Insumo {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento?: string | null;
  cantRecibida: number;
  stock: number;
  unidad_medida_id?: number | null;
  medida: string;
}

export interface InsumoConId extends Insumo {
  id: number;
  activo: boolean;
  tipo_insumo_id?: number | null;
  tipo_insumo_nombre?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  estadoVencimiento?: string | null;
  es_aditivo?: boolean;
  tiene_datos_nutricionales?: boolean;
  modificado_manualmente?: boolean;
  fuente_datos?: string | null;
}

export interface InsumoForm {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  cantRecibida: number | "";
  stock: number | "";
  medida: string;
  tipo_insumo_id?: number | "";
  proveedor_id?: number | "";
}

export interface LoteInsumoItem {
  id: number;
  lote: string;
  nombre: string;
  stock: number;
  cantRecibida: number;
  medida: string;
  fechaRecepcion: string;
  fechaVencimiento: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  estadoVencimiento: 'VIGENTE' | 'PROXIMO_A_VENCER' | 'VENCIDO' | 'AGOTADO';
  dias_para_vencer?: number | null;
  activo: boolean;
  es_aditivo?: boolean;
  tiene_datos_nutricionales?: boolean;
  modificado_manualmente?: boolean;
  fuente_datos?: string | null;
}

export interface InsumoAgrupadoPorTipo {
  tipo_id: number;
  nombre: string;
  descripcion?: string | null;
  unidad_medida_id?: number | null;
  unidadMedida: string;
  unidad_medida_abreviatura?: string | null;
  stock_total: number;
  tiene_vencidos: boolean;
  tiene_proximos: boolean;
  lotes: LoteInsumoItem[];
  lotes_agotados: LoteInsumoItem[];
}

export interface RecepcionInsumoForm {
  tipo_insumo_id: number | '';
  proveedor_id: number | '';
  lote: string;
  nombre: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  cantRecibida: number | '';
}

export interface TrazabilidadLoteProduccion {
  lote_produccion_id: number;
  lote_produccion_codigo: string;
  producto_nombre: string;
  fecha_produccion: string;
  cantidad_usada: number;
  unidad_medida: string;
  responsable_nombre: string;
}

export interface InsumoDetalleTrazabilidad {
  id: number;
  nombre: string;
  lote: string;
  stock: number;
  cantRecibida: number;
  medida: string;
  fechaRecepcion: string;
  fechaVencimiento: string | null;
  tipo_insumo_id?: number | null;
  tipo_insumo_nombre?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  estadoVencimiento: string;
  lotes_produccion: TrazabilidadLoteProduccion[];
}

export type FuenteDatosNutricionales =
  | "ROTULO_PROVEEDOR"
  | "SARA_2"
  | "OTRA_BIBLIOGRAFIA"
  | "VALOR_PROPIO";

export interface AlimentoReferenciaSARA {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  energia_kcal: number;
  energia_kj: number;
  carbohidratos: number;
  azucares_totales: number;
  azucares_anadidos: number;
  proteinas: number;
  grasas_totales: number;
  grasas_saturadas: number;
  grasas_trans: number;
  fibra_alimentaria: number;
  sodio_mg: number;
  fuente: string;
  es_aditivo: boolean;
}

export interface DatosNutricionalesInsumoResponse {
  insumo_id: number;
  nombre_insumo: string;
  es_aditivo: boolean;
  fuente_datos: FuenteDatosNutricionales | null;
  fuente_detalle: string | null;
  alimento_referencia_id: string | null;
  fecha_carga_nutricional: string | null;
  usuario_carga_nutricional: string | null;
  modificado_manualmente: boolean;
  fecha_modificacion_nutricional: string | null;
  usuario_modificacion_nutricional: string | null;
  campos_modificados: string[];
  valores_referencia: Record<string, number> | null;
  energia_kcal: number | null;
  energia_kj: number | null;
  carbohidratos: number | null;
  azucares_totales: number | null;
  azucares_anadidos: number | null;
  proteinas: number | null;
  grasas_totales: number | null;
  grasas_saturadas: number | null;
  grasas_trans: number | null;
  fibra_alimentaria: number | null;
  sodio_mg: number | null;
  tiene_datos_cargados: boolean;
}

export interface DatosNutricionalesInsumoUpdate {
  es_aditivo: boolean;
  fuente_datos: FuenteDatosNutricionales;
  fuente_detalle?: string | null;
  alimento_referencia_id?: string | null;
  energia_kcal?: number | null;
  energia_kj?: number | null;
  carbohidratos?: number | null;
  azucares_totales?: number | null;
  azucares_anadidos?: number | null;
  proteinas?: number | null;
  grasas_totales?: number | null;
  grasas_saturadas?: number | null;
  grasas_trans?: number | null;
  fibra_alimentaria?: number | null;
  sodio_mg?: number | null;
}
