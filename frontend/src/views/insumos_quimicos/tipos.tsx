export type TipoQuimico = 'DETERGENTE' | 'DESINFECTANTE' | 'DESENGRASANTE' | 'SANITIZANTE' | 'OTRO';
export type UnidadMedida = 'L' | 'ML' | 'KG' | 'G' | 'UN';

export interface InsumoQuimico {
  id: number;
  nombre: string;
  tipo: TipoQuimico;
  unidad_medida: UnidadMedida;
  stock_actual: number;
  activo: boolean;
  created_at?: string;
}

export interface InsumoQuimicoCreateDTO {
  nombre: string;
  tipo: TipoQuimico;
  unidad_medida: UnidadMedida;
  stock_actual: number;
}

export interface InsumoQuimicoUpdateDTO {
  nombre?: string;
  tipo?: TipoQuimico;
  unidad_medida?: UnidadMedida;
  stock_actual?: number;
  activo?: boolean;
}

export const OPCIONES_TIPO: { value: TipoQuimico; label: string }[] = [
  { value: 'DETERGENTE', label: 'Detergente' },
  { value: 'DESINFECTANTE', label: 'Desinfectante' },
  { value: 'DESENGRASANTE', label: 'Desengrasante' },
  { value: 'SANITIZANTE', label: 'Sanitizante' },
  { value: 'OTRO', label: 'Otro' },
];

export const OPCIONES_UNIDAD: { value: UnidadMedida; label: string }[] = [
  { value: 'L', label: 'Litros (L)' },
  { value: 'ML', label: 'Mililitros (ML)' },
  { value: 'KG', label: 'Kilogramos (KG)' },
  { value: 'G', label: 'Gramos (G)' },
  { value: 'UN', label: 'Unidades (UN)' },
];