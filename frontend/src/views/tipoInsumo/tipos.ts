export interface LoteInsumoHistorico {
  id: number;
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento: string | null;
  cantRecibida: number;
  stock: number;
  medida: string;
  estadoVencimiento: string;
  activo: boolean;
  proveedor_nombre: string | null;
}
export interface AlergenoSimple {
  id: number;
  nombre: string;
  simbolo?: string | null;
}
export interface TipoInsumo {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_id?: number | null;
  unidadMedida: string;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  cantidad_referencia?: number;
  equivalencia_gramos?: number | null;
  es_aditivo?: boolean;
  clase_funcional?: string | null;
  numero_ins?: string | null;
  tiene_datos_nutricionales?: boolean;
  activo: boolean;
  cantidad_lotes?: number;
  total_lotes?: number;
  stock_total?: number;
  alergenos?: AlergenoSimple[];
  nombres_alergenos?: string;
}

export interface TipoInsumoDetalle extends TipoInsumo {
  lotes?: LoteInsumoHistorico[];
  lotes_historicos?: LoteInsumoHistorico[];
}

export interface TipoInsumoForm {
  nombre: string;
  descripcion: string;
  unidad_medida_id: number | '';
  cantidad_referencia?: number | '';
  equivalencia_gramos?: number | '';
  es_aditivo?: boolean;
  clase_funcional?: string;
  numero_ins?: string;
  alergeno_ids?: number[];
}
