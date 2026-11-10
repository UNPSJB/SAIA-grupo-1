export type EstadoIncidente =
  | 'pendiente'
  | 'en_revision'
  | 'cerrado'
  | 'resuelto'
  | 'descartado'
  | 'reabierto';

export type TipoIncidente =
  | 'equipamiento'
  | 'limpieza'
  | 'edilicio'
  | 'materia_prima'
  | 'plagas'
  | 'conducta'
  | 'otro';

export const ETIQUETAS_TIPO: Record<TipoIncidente, string> = {
  equipamiento: 'Equipamiento / Maquinaria',
  limpieza: 'Higiene y Limpieza',
  edilicio: 'Edilicio / Instalaciones',
  materia_prima: 'Materia Prima / Insumos',
  plagas: 'Control de Plagas',
  conducta: 'Personal / Conducta',
  otro: 'Otro',
};

export const COLORES_TIPO: Record<TipoIncidente, string> = {
  equipamiento: '#3b82f6',
  limpieza: '#10b981',
  edilicio: '#f59e0b',
  materia_prima: '#8b5cf6',
  plagas: '#ef4444',
  conducta: '#ec4899',
  otro: '#64748b',
};

export interface Incidente {
  id: number;
  descripcion: string;
  tipo?: TipoIncidente;
  nombre_tipo?: string | null;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  estado: EstadoIncidente;
  creado_el: string;
  reportado_por_id: number;
  nombre_reportante: string;
  foto_url?: string | null;
  accion_correctiva?: string | null;
  cerrado_el?: string | null;
  resuelto_por_id?: number | null;
  nombre_resolutor?: string | null;
  motivo_reapertura?: string | null;
}

export interface CategoriaIncidente {
  id: number;
  nombre: string;
  descripcion?: string | null;
  total_incidentes?: number;
}

export interface CategoriaIncidenteInput {
  nombre: string;
  descripcion?: string;
}

export type FiltroEstadoGrupo = 'TODOS' | 'ABIERTOS' | 'CERRADOS';

export const ESTADOS_ABIERTOS: readonly EstadoIncidente[] = [
  'pendiente',
  'en_revision',
  'reabierto',
];

export const ESTADOS_CERRADOS: readonly EstadoIncidente[] = [
  'cerrado',
  'resuelto',
  'descartado',
];

export const esIncidenteAbierto = (estado: EstadoIncidente): boolean =>
  ESTADOS_ABIERTOS.includes(estado);

export const esIncidenteCerrado = (estado: EstadoIncidente): boolean =>
  ESTADOS_CERRADOS.includes(estado);

export const ETIQUETAS_ESTADO: Record<EstadoIncidente, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  reabierto: 'Reabierto',
  cerrado: 'Cerrado',
  resuelto: 'Cerrado',
  descartado: 'Descartado',
};

export const formatearFecha = (fechaIso?: string | null): string => {
  if (!fechaIso) return '-';
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return fechaIso;
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(fechaIso);
  }
};

export const DESCRIPCION_MAX = 500;
export const ACCION_CORRECTIVA_MAX = 1000;
export const MOTIVO_REAPERTURA_MAX = 500;
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png'];

export const mensajeDeError = (detalle: unknown, porDefecto: string): string => {
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle)) {
    return detalle.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
  }
  return porDefecto;
};

export type NivelUrgencia = 'RECIENTE' | 'ATENCION' | 'CRITICO';

export interface IncidenteAbierto extends Incidente {
  horas_abierto: number;
  dias_abierto: number;
  nivel_urgencia: NivelUrgencia;
}

export interface MetricasAntiguedad {
  menos_24h: number;
  entre_24h_y_72h: number;
  mas_72h: number;
}

export interface IncidentesMetricas {
  total_abiertos: number;
  por_antiguedad: MetricasAntiguedad;
  por_estado: Record<string, number>;
  mas_antiguo_horas?: number | null;
  mas_antiguo_id?: number | null;
}

export interface EstadisticaTipoItem {
  tipo: TipoIncidente;
  nombre: string;
  cantidad: number;
  porcentaje: number;
}

export interface EstadisticaIncidentesPorTipo {
  total: number;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  por_tipo: EstadisticaTipoItem[];
}

export const formatearAntiguedad = (horas: number): string => {
  if (horas < 1) return 'Menos de 1 h';
  if (horas < 24) return `${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = Math.floor(horas % 24);
  if (horasRestantes === 0) return `${dias} d`;
  return `${dias} d ${horasRestantes} h`;
};

export { EtiquetaCategoria, obtenerEstiloCategoria } from './etiquetaCategoria';
export type { EstiloCategoria } from './etiquetaCategoria';


