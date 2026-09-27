export type Periodo = 'semana' | 'mes';

export interface CumplimientoResumen {
  hechas: number;
  pendientes: number;
  porcentaje: number;
}

export interface ConsumoInsumo {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface DashboardResumen {
  cumplimiento_actual: CumplimientoResumen;
  consumo_insumos: ConsumoInsumo[];
}
