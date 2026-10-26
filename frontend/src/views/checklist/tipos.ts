export type Frecuencia = 'diaria' | 'semanal' | 'mensual';

export type EstadoTareaItem = 'pendiente' | 'realizado' | 'no_realizado' | 'vencido';

export type MotivoNoRealizado = 'equipo_fuera_de_uso' | 'falta_de_insumo' | 'otro' | string;

export type EstadoGeneralChecklist = 'pendiente' | 'completado' | 'vencido';

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
  tareas_no_realizadas?: number;
  tareas_pendientes: number;
  tareas_vencidas?: number;
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
