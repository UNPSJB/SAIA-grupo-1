export type Periodo = 'dia' | 'semana' | 'mes';

export interface CumplimientoResumen {
  hechas: number;
  pendientes: number;
  vencidas: number;
  porcentaje: number;
}

export interface ConsumoInsumo {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface ConsumoResumen {
  consumo: ConsumoInsumo[];
  unidades_disponibles: string[];
  unidad_actual?: string;
}

export interface DashboardResumen {
  cumplimiento_actual: CumplimientoResumen;
  consumo_insumos: ConsumoInsumo[];
  unidades_disponibles?: string[];
  unidad_actual?: string;
}

export type AgrupacionGrafico = 'dia' | 'semana';

export interface PuntoCumplimiento {
  fecha?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  etiqueta: string;
  total_checklists: number;
  total_tareas: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  porcentaje: number;
}

export interface GraficoCumplimientoResponse {
  agrupacion: AgrupacionGrafico;
  desde: string;
  hasta: string;
  total_checklists: number;
  total_tareas: number;
  tareas_completadas: number;
  promedio_cumplimiento: number;
  puntos: PuntoCumplimiento[];
}
