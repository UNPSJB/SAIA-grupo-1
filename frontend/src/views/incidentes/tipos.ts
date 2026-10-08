export type EstadoIncidente =
  | 'pendiente'
  | 'en_revision'
  | 'cerrado'
  | 'resuelto'
  | 'descartado'
  | 'reabierto';

export interface Incidente {
  id: number;
  descripcion: string;
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
