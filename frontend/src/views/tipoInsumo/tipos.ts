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
  unidadMedida: string;
  activo: boolean;
  cantidad_lotes?: number;
}

export interface TipoInsumoDetalle extends TipoInsumo {
  lotes_historicos: LoteInsumoHistorico[];
}

export interface TipoInsumoForm {
  nombre: string;
  descripcion: string;
  unidadMedida: string;
}
