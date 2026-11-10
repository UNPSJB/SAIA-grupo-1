export interface Insumo {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento?: string | null;
  cantRecibida: number;
  stock: number;
  medida: string;
  tipo_insumo_id?: number | null;
  tipo_insumo_nombre?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  estadoVencimiento?: string | null;
}

export interface InsumoConId extends Insumo {
  id: number;
  activo: boolean;
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
}

export interface InsumoAgrupadoPorTipo {
  tipo_id: number;
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
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
