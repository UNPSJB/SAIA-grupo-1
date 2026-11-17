export interface UnidadMedidaItem {
  id: number;
  nombre: string;
  abreviatura: string;
  activo: boolean;
  total_referencias: number;
}

export interface UnidadMedidaForm {
  nombre: string;
  abreviatura: string;
}
