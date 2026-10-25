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

export type TipoDetalleEstadisticas = 'vencimientos' | 'tareas' | 'incidentes' | 'insumos' | 'produccion';

export interface VencimientoItemDashboard {
  id: string;
  origen: string;
  concepto: string;
  responsable: string;
  fecha: string;
  dias_restantes: number;
  estado: 'vencido' | 'proximo' | 'vigente';
}

export interface IncidentesMetricasDashboard {
  total_abiertos: number;
  por_antiguedad: {
    menos_24h: number;
    entre_24h_y_72h: number;
    mas_72h: number;
  };
  por_estado: Record<string, number>;
  mas_antiguo_horas?: number;
  mas_antiguo_id?: number;
}

export interface ResumenVencimientoGrupo {
  titulo: string;
  vencidos: number;
  proximos: number;
  alDia: number;
}

export interface PanelDashboardProps {
  onNavegar?: (modulo: string, subvista?: string, filtroEstado?: string) => void;
}
