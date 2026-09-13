export interface Insumo {
  nombre: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento?: string | null;
  cantRecibida: number;
  stock: number;
  medida: string;
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
