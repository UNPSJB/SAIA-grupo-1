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
