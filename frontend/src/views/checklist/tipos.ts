export type Frecuencia = 'diaria' | 'semanal' | 'mensual';

export type EstadoTareaItem = 'pendiente' | 'realizado' | 'no_realizado' | 'vencido' | 'reasignado';

export type MotivoNoRealizado = 'equipo_fuera_de_uso' | 'falta_de_insumo' | 'otro' | string;

export type EstadoGeneralChecklist = 'pendiente' | 'completado' | 'vencido';

export interface HistorialItem {
  id: number;
  fecha_hora: string;
  usuario_legajo?: number | null;
  usuario_nombre?: string | null;
  accion: string;
  detalle: string;
}

export interface InsumoUtilizado {
  id?: number;
  nombre: string;
  cantidad: number;
  unidad?: string;
}

export interface ChecklistItem {
  id: number;
  checklist_id: number;
  plan_id?: number | null;
  nombre_plan: string;
  nombre_equipo?: string | null;
  tarea_id?: number | null;
  nombre_tarea: string;
  descripcion_tarea?: string | null;
  frecuencia: Frecuencia;
  estado: EstadoTareaItem;
  responsable_legajo?: number | null;
  nombre_responsable?: string | null;
  imagen?: string | null;
  insumos_utilizados: InsumoUtilizado[];
  fecha_hora_fin?: string | null;
  motivo_no_realizado?: MotivoNoRealizado | null;
  observacion_no_realizado?: string | null;
  fecha_hora_no_realizado?: string | null;
  es_reasignada?: boolean;
  checklist_fecha?: string | null;
  dias_restantes?: number | null;
  historial?: HistorialItem[];
}

export interface Checklist {
  id: number;
  fecha: string;
  creado_en: string;
  activo: boolean;
  responsable_legajo: number;
  nombre_responsable?: string | null;
  estado: EstadoGeneralChecklist;
  porcentaje_cumplimiento: number;
  total_tareas: number;
  tareas_completadas: number;
  tareas_reasignadas?: number;
  tareas_no_realizadas?: number;
  tareas_pendientes: number;
  tareas_vencidas?: number;
  tiene_reasignacion_no_leida?: boolean;
  items: ChecklistItem[];
}

export interface PersonalResumen {
  legajo: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  capacidad?: 'OPERAR' | 'ADMINISTRAR' | 'AMBAS';
}

/** El responsable no se manda: lo define la sesión del operador que genera. */
export interface ChecklistGenerarPayload {
  fecha?: string;
}

export interface CompletarTareaPayload {
  responsable_legajo: number;
  insumos_utilizados?: InsumoUtilizado[];
}

export interface MarcarNoRealizadaPayload {
  motivo: MotivoNoRealizado;
  observacion?: string;
}

export interface ReasignarTareaPayload {
  nuevo_responsable_legajo: number;
  motivo?: string;
}
