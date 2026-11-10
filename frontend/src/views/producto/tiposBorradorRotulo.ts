export interface OctogonoItem {
  id: string;
  texto: string;
  tipo: string;
}

export interface FilaTablaNutricional {
  nutriente: string;
  por_100g?: string | null;
  por_porcion?: string | null;
  porcentaje_vd?: string | null;
  es_subitem?: boolean;
}

export interface BorradorRotuloResponse {
  id: number;
  producto_id: number;
  producto_nombre: string;
  denominacion_venta: string | null;
  contenido_neto: string | null;
  rnpa_rppa: string | null;
  rne: string | null;
  razon_social: string | null;
  direccion_origen: string | null;
  pais_origen: string;
  lote: string | null;
  fecha_duracion: string | null;
  instrucciones_conservacion: string | null;
  modo_empleo: string | null;
  lista_ingredientes_texto: string | null;
  tiene_lista_ingredientes: boolean;
  porcion: string | null;
  porciones_por_envase: string | null;
  valor_energetico_kcal: number | null;
  valor_energetico_kj: number | null;
  carbohidratos: number | null;
  azucares_totales: number | null;
  azucares_anadidos: number | null;
  proteinas: number | null;
  grasas_totales: number | null;
  grasas_saturadas: number | null;
  grasas_trans: number | null;
  fibra_alimentaria: number | null;
  sodio: number | null;
  tabla_marcada_incompleta: boolean;
  tiene_exceso_azucares: boolean;
  tiene_exceso_sodio: boolean;
  tiene_exceso_grasas_saturadas: boolean;
  tiene_exceso_grasas_totales: boolean;
  tiene_exceso_calorias: boolean;
  contiene_edulcorantes: boolean;
  contiene_cafeina: boolean;
  modo_calculo_octogonos: string;
  octogonos: OctogonoItem[];
  tiene_octogonos: boolean;
  mensaje_octogonos: string;
  datos_faltantes: string[];
  tabla_nutricional_incompleta: boolean;
  motivos_tabla_incompleta: string[];
  filas_tabla_nutricional: FilaTablaNutricional[];
  leyenda_obligatoria: string;
  es_completo_para_tramite: boolean;
  actualizado_el: string;
  usuario_actualizacion: string | null;
}

export interface BorradorRotuloUpdate {
  denominacion_venta?: string | null;
  contenido_neto?: string | null;
  rnpa_rppa?: string | null;
  rne?: string | null;
  razon_social?: string | null;
  direccion_origen?: string | null;
  pais_origen?: string;
  lote?: string | null;
  fecha_duracion?: string | null;
  instrucciones_conservacion?: string | null;
  modo_empleo?: string | null;
  porcion?: string | null;
  porciones_por_envase?: string | null;
  valor_energetico_kcal?: number | null;
  valor_energetico_kj?: number | null;
  carbohidratos?: number | null;
  azucares_totales?: number | null;
  azucares_anadidos?: number | null;
  proteinas?: number | null;
  grasas_totales?: number | null;
  grasas_saturadas?: number | null;
  grasas_trans?: number | null;
  fibra_alimentaria?: number | null;
  sodio?: number | null;
  tabla_marcada_incompleta?: boolean;
  tiene_exceso_azucares?: boolean;
  tiene_exceso_sodio?: boolean;
  tiene_exceso_grasas_saturadas?: boolean;
  tiene_exceso_grasas_totales?: boolean;
  tiene_exceso_calorias?: boolean;
  contiene_edulcorantes?: boolean;
  contiene_cafeina?: boolean;
  modo_calculo_octogonos?: string;
}

export interface ExportarBorradorRequest {
  incluir_leyenda: boolean;
  formato?: string;
}

export interface ExportarBorradorResponse {
  producto_id: number;
  producto_nombre: string;
  contenido_html: string;
  leyenda_incluida: boolean;
  timestamp: string;
}
