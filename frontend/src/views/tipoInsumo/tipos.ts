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

export interface TipoInsumo {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_id?: number | null;
  unidadMedida: string;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  activo: boolean;
  cantidad_lotes?: number;
  total_lotes?: number;
  stock_total?: number;
}

export interface TipoInsumoDetalle extends TipoInsumo {
  lotes?: LoteInsumoHistorico[];
  lotes_historicos?: LoteInsumoHistorico[];
}

export interface TipoInsumoForm {
  nombre: string;
  descripcion: string;
  unidad_medida_id: number | '';
}
