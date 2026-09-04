export interface Insumo {
  nombre: string;
  unidad_medida: string;
}

export interface InsumoConId extends Insumo {
  id: number;
}
