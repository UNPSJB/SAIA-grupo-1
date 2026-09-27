export type Frecuencia = 'diario' | 'semanal' | 'mensual';

export type EstadoTareaItem = 'pendiente' | 'realizado';

export type EstadoGeneralChecklist = 'pendiente' | 'completado' | 'vencido';

export interface InsumoUtilizado {
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
  tareas_pendientes: number;
  items: ChecklistItem[];
}

export interface PersonalResumen {
  legajo: number;
  nombre: string;
  apellido: string;
  activo: boolean;
}

export interface ChecklistGenerarPayload {
  responsable_legajo: number;
  fecha?: string;
}

export interface CompletarTareaPayload {
  responsable_legajo: number;
  insumos_utilizados?: InsumoUtilizado[];
}


