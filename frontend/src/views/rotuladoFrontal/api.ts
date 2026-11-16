import { apiFetch } from '../../api/client';
import type {
  Calculo,
  Conjunto,
  ConjuntoCreate,
  ConjuntoResumen,
  DatosConjunto,
  EstadoConjunto,
  EstadoFisico,
  EstadoModulo,
  ValoresNutricionales,
} from './tipos';

const BASE = '/rotulado-frontal';

export class ErrorApi extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

interface ErrorValidacion {
  loc?: (string | number)[];
  msg?: string;
}

/** El backend responde {detail: string} o, en un 422 de pydantic, {detail: [{loc, msg}]}. */
const mensajeDeError = (cuerpo: unknown, porDefecto: string): string => {
  const detail = (cuerpo as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return (detail as ErrorValidacion[])
      .map((e) => (e.msg || '').replace(/^Value error, /, ''))
      .filter(Boolean)
      .join(' · ') || porDefecto;
  }
  return porDefecto;
};

async function pedir<T>(ruta: string, init: RequestInit = {}, porDefecto = 'No se pudo completar la acción.'): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(`${BASE}${ruta}`, init);
  } catch {
    throw new ErrorApi('Error de conexión con el servidor.', 0);
  }
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new ErrorApi(mensajeDeError(cuerpo, porDefecto), res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (method: string, cuerpo: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

// --- Interruptor del módulo ---
export const obtenerEstadoModulo = () => pedir<EstadoModulo>('/modulo');
export const cambiarEstadoModulo = (activo: boolean) => pedir<EstadoModulo>('/modulo', json('PUT', { activo }));

// --- Conjuntos de parámetros ---
export const listarConjuntos = (estado?: EstadoConjunto) =>
  pedir<ConjuntoResumen[]>(`/parametros${estado ? `?estado=${estado}` : ''}`);
export const obtenerConjunto = (id: number) => pedir<Conjunto>(`/parametros/${id}`);
export const crearConjunto = (datos: ConjuntoCreate) => pedir<Conjunto>('/parametros', json('POST', datos));
export const actualizarConjunto = (id: number, datos: ConjuntoCreate) =>
  pedir<Conjunto>(`/parametros/${id}`, json('PUT', datos));
export const publicarConjunto = (id: number) => pedir<Conjunto>(`/parametros/${id}/publicar`, { method: 'POST' });
export const eliminarConjunto = (id: number) => pedir<void>(`/parametros/${id}`, { method: 'DELETE' });
export const nuevaVersion = (id: number, datos: DatosConjunto) =>
  pedir<Conjunto>(`/parametros/${id}/nueva-version`, json('POST', datos));

// --- Cálculos por producto ---
export const calcularRotulado = (productoId: number, valores: ValoresNutricionales, estadoFisico?: EstadoFisico | null) =>
  pedir<Calculo>(
    `/productos/${productoId}/calculos`,
    json('POST', { valores, estado_fisico: estadoFisico ?? null }),
  );
export const listarCalculos = (productoId: number) => pedir<Calculo[]>(`/productos/${productoId}/calculos`);
