export interface ElementoDeLimpieza {
  id: number;
  nombre: string;
  frecuenciaDeCambio?: number | null;
  fechaCambio?: string | null;
  activo: boolean;
}

export type ElementoDeLimpiezaCreate = Omit<ElementoDeLimpieza, 'id' | 'activo' | 'fechaCambio'>;
export type ElementoDeLimpiezaUpdate = Partial<ElementoDeLimpieza>;