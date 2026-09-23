export interface ElementoDeLimpieza {
  id: number;
  nombre: string;
  frecuenciaDeCambio?: number | null;
  activo: boolean;
}

export type ElementoDeLimpiezaCreate = Omit<ElementoDeLimpieza, 'id' | 'activo'>;
export type ElementoDeLimpiezaUpdate = Partial<ElementoDeLimpieza>;