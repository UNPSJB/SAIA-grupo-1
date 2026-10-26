export interface MotivoNoRealizado {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface MotivoCreate {
  nombre: string;
}

export interface MotivoCambiarEstado {
  activo: boolean;
}
