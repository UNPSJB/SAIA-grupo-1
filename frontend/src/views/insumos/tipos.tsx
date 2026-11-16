export interface Insumo {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento?: string | null;
  cantRecibida: number;
  stock: number;
  medida: string;
  es_aditivo?: boolean;
  fuente_datos?: string | null;
  fuente_detalle?: string | null;
  alimento_referencia_id?: string | null;
  modificado_manualmente?: boolean;
  tiene_datos_nutricionales?: boolean;
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

export interface InsumoConId extends Insumo {
  id: number;
}

export interface InsumoForm {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  cantRecibida: number | "";
  stock: number | "";
  medida: string;
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
