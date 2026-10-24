export type TipoQuimico = 'DETERGENTE' | 'DESINFECTANTE' | 'DESENGRASANTE' | 'SANITIZANTE' | 'OTRO';
export type UnidadMedida = 'L' | 'ML' | 'KG' | 'G' | 'UN';

export interface InsumoQuimico {
  id: number;
  nombre: string;
  tipo: TipoQuimico;
  unidad_medida: UnidadMedida;
  stock_actual: number;
  proveedor?: string | null;
  activo: boolean;
  created_at?: string;
}

export interface InsumoQuimicoCreateDTO {
  nombre: string;
  tipo: TipoQuimico;
  unidad_medida: UnidadMedida;
  stock_actual: number;
  proveedor?: string | null;
}

export interface InsumoQuimicoUpdateDTO {
  nombre?: string;
  tipo?: TipoQuimico;
  unidad_medida?: UnidadMedida;
  stock_actual?: number;
  proveedor?: string | null;
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

export const COLORES_TIPO_QUIMICO: Record<string, string> = {
  DETERGENTE: '#3b82f6',
  DESINFECTANTE: '#10b981',
  DESENGRASANTE: '#f59e0b',
  SANITIZANTE: '#8b5cf6',
  OTRO: '#64748b',
};

export type AgrupacionTiempo = 'dia' | 'semana' | 'mes';

export interface MovimientoInsumoQuimico {
  id: string;
  fecha: string;
  fecha_hora?: string | null;
  insumo_id?: number | null;
  insumo_nombre: string;
  tipo?: string | null;
  proveedor?: string | null;
  cantidad: number;
  unidad: string;
  responsable_legajo?: number | null;
  responsable_nombre?: string | null;
  tarea_nombre: string;
  plan_nombre: string;
  sector_o_equipo?: string | null;
  checklist_id: number;
}

export interface PuntoEvolucionConsumo {
  fecha: string;
  etiqueta: string;
  total_consumido: number;
  por_tipo: Record<string, number>;
}

export interface ConsumoAgrupadoItem {
  clave: string;
  etiqueta: string;
  cantidad_total: number;
  porcentaje: number;
  cantidad_movimientos: number;
  unidad: string;
}

export interface MetricasConsumoHistorico {
  consumo_total_periodo: number;
  consumo_periodo_anterior: number;
  variacion_porcentual?: number | null;
  promedio_diario: number;
  total_movimientos: number;
  quimico_mas_consumido?: string | null;
  cantidad_quimico_mas_consumido?: number | null;
  unidad_predominante: string;
}

export interface ConsumoHistoricoResponse {
  desde?: string | null;
  hasta?: string | null;
  insumo_id?: number | null;
  unidad_seleccionada?: string | null;
  unidades_disponibles: string[];
  agrupacion_tiempo: AgrupacionTiempo;
  total_registros: number;
  metricas: MetricasConsumoHistorico;
  evolucion: PuntoEvolucionConsumo[];
  por_tipo: ConsumoAgrupadoItem[];
  por_proveedor: ConsumoAgrupadoItem[];
  movimientos: MovimientoInsumoQuimico[];
}
