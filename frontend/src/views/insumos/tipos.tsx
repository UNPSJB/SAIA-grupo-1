export interface Insumo {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento?: string;
  cantRecibida: number;
  stock: number;
  medida: string;
}

export interface InsumoConId extends Insumo {
  id: number;
}
