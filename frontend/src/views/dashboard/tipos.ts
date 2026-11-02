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

export type TipoDetalleEstadisticas =
  | 'vencimientos'
  | 'tareas'
  | 'incidentes'
  | 'insumos'
  | 'produccion';

export interface VencimientoItemDashboard {
  id: string;
  origen: string;
  concepto: string;
  responsable: string;
  referencia_id?: number;
  referenciaId?: number;
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
  onIrAlRegistro?: (vencimiento: {
    origen?: string;
    tipo?: string;
    referenciaId?: number;
    referencia_id?: number;
    responsable?: string;
    concepto?: string;
    id?: string;
  }) => void;
}

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


export interface PuntoTendenciaCumplimiento {
  fecha: string;
  etiqueta: string;
  total_tareas: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  porcentaje: number;
}

export interface CumplimientoDesgloseItem {
  id: number;
  nombre: string;
  subtitulo?: string | null;
  total_tareas: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  porcentaje: number;
}

export interface ItemDetalleChecklist {
  id: number;
  checklist_id: number;
  fecha: string;
  nombre_tarea: string;
  frecuencia: string;
  sector_o_equipo: string;
  tipo_objeto: string;
  responsable: string;
  turno: string;
  estado: string;
  hora_fin?: string | null;
}

export interface KpisCumplimientoDetallado {
  total_checklists: number;
  total_tareas: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  porcentaje_general: number;
  sector_menor_cumplimiento?: string | null;
  porcentaje_sector_menor?: number | null;
  equipo_menor_cumplimiento?: string | null;
  porcentaje_equipo_menor?: number | null;
  turno_critico?: string | null;
  porcentaje_turno_critico?: number | null;
}

export interface CumplimientoDetalladoResponse {
  desde?: string | null;
  hasta?: string | null;
  sector_id?: number | null;
  turno?: string | null;
  kpis: KpisCumplimientoDetallado;
  tendencia_temporal: PuntoTendenciaCumplimiento[];
  desglose_por_sector: CumplimientoDesgloseItem[];
  desglose_por_equipo: CumplimientoDesgloseItem[];
  desglose_por_turno: CumplimientoDesgloseItem[];
  items_detalle: ItemDetalleChecklist[];
}

export interface PuntoProduccion {
  nombre: string;
  cantidad: number;
  lotes: number;
}

export interface ProduccionDashboardResponse {
  periodo: string;
  desde?: string | null;
  hasta?: string | null;
  total_lotes: number;
  total_cantidad: number;
  puntos: PuntoProduccion[];
}
