export type Frecuencia = 'diaria' | 'semanal' | 'mensual';

export type EstadoTareaItem = 'pendiente' | 'realizado';

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

export interface PasoProcedimiento {
  numero?: string;
  texto: string;
}

export const parsearPasos = (texto?: string | null): PasoProcedimiento[] => {
  if (!texto || !texto.trim()) return [];

  const limpio = texto.trim();
  const regexPaso = /Paso\s+(\d+)[\.:]\s*/gi;
  const matches = Array.from(limpio.matchAll(regexPaso));

  if (matches.length > 0) {
    const pasos: PasoProcedimiento[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const num = match[1];
      const startIdx = (match.index ?? 0) + match[0].length;
      const endIdx = i + 1 < matches.length ? (matches[i + 1].index ?? limpio.length) : limpio.length;
      const pasoTexto = limpio.substring(startIdx, endIdx).trim();
      pasos.push({
        numero: `Paso ${num}`,
        texto: pasoTexto,
      });
    }
    return pasos;
  }

  if (limpio.includes('\n')) {
    return limpio
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((linea) => ({ texto: linea }));
  }

  return [{ texto: limpio }];
};
