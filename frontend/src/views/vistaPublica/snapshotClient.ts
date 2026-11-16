import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { ProductoPublico } from '../producto/tipos';

export interface SnapshotConfigPublica {
  ver_grafico: boolean;
  verAcercaDeNosotros: boolean;
  verProductos: boolean;
  ver_dias_sin_incidentes: boolean;
  ver_total_lotes: boolean;
  ver_volumen_fabricado: boolean;
  ver_producto_mas_elaborado: boolean;
  ver_grafico_totales_productos: boolean;
  ver_grafico_red_arana: boolean;
}

export interface SnapshotQR {
  id_alfanumerico: string;
  estado: boolean;
  config: SnapshotConfigPublica;
}

export interface SnapshotProductoMasElaborado {
  id: number;
  nombre: string;
  cantidad: number;
  lotes: number;
  unidad: string;
}

export interface SnapshotRadarItem {
  dimension: string;
  porcentaje: number;
  meta: number;
  tareas_completadas: number;
  total_tareas: number;
}

export interface SnapshotEstadisticas {
  dias_sin_incidentes: number | null;
  total_lotes: number;
  volumen_fabricado: number;
  unidad_volumen: string;
  producto_mas_elaborado: SnapshotProductoMasElaborado | null;
  totales_productos: SnapshotProductoMasElaborado[];
  red_arana_cumplimiento: SnapshotRadarItem[];
}

export interface SnapshotPuntoCumplimiento {
  etiqueta: string;
  porcentaje: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  total_tareas: number;
  total_checklists: number;
}

export interface SnapshotGraficoCumplimiento {
  total_checklists: number;
  total_tareas: number;
  tareas_completadas: number;
  promedio_cumplimiento: number;
  puntos: SnapshotPuntoCumplimiento[];
}

export interface SnapshotVistaPublica {
  generado_el: string;
  qr: SnapshotQR | null;
  estadisticas: SnapshotEstadisticas | null;
  cumplimiento_limpieza: Record<string, SnapshotGraficoCumplimiento>;
  acerca_de_nosotros: { descripcion: string } | null;
  productos: ProductoPublico[];
}

interface CacheEntry {
  snapshot: SnapshotVistaPublica;
  cachedAt: number;
}

const STORAGE_KEY = 'saia_vista_publica_snapshot_v1';
const CACHE_TTL_MS = 60_000;
const REVALIDATE_INTERVAL_MS = 60_000;

let memoryCache: CacheEntry | null = null;
let inFlightRequest: Promise<{ snapshot: SnapshotVistaPublica; fromFallback: boolean }> | null = null;

function esSnapshotValido(value: unknown): value is SnapshotVistaPublica {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.generado_el !== 'string') return false;
  if (!Array.isArray(obj.productos)) return false;
  if (obj.cumplimiento_limpieza !== null && typeof obj.cumplimiento_limpieza !== 'object') return false;
  return true;
}

function leerCacheLocal(): CacheEntry | null {
  if (memoryCache) return memoryCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const entry = parsed as Partial<CacheEntry>;
    if (typeof entry.cachedAt !== 'number' || !esSnapshotValido(entry.snapshot)) {
      return null;
    }
    memoryCache = { snapshot: entry.snapshot, cachedAt: entry.cachedAt };
    return memoryCache;
  } catch {
    return null;
  }
}

function guardarCacheLocal(snapshot: SnapshotVistaPublica): CacheEntry {
  const entry: CacheEntry = { snapshot, cachedAt: Date.now() };
  memoryCache = entry;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    return entry;
  }
  return entry;
}

export async function obtenerSnapshotVistaPublica(
  forzarRed = false,
): Promise<{ snapshot: SnapshotVistaPublica; fromFallback: boolean }> {
  const cacheActual = leerCacheLocal();
  if (!forzarRed && cacheActual && Date.now() - cacheActual.cachedAt < CACHE_TTL_MS) {
    return { snapshot: cacheActual.snapshot, fromFallback: false };
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const res = await apiFetch('/identificadorQR/publico/snapshot', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }
      const data: unknown = await res.json();
      if (!esSnapshotValido(data)) {
        throw new Error('Formato de snapshot inválido');
      }
      guardarCacheLocal(data);
      return { snapshot: data, fromFallback: false };
    } catch (err) {
      const respaldo = leerCacheLocal();
      if (respaldo) {
        return { snapshot: respaldo.snapshot, fromFallback: true };
      }
      throw err;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

export function useSnapshotVistaPublica(identificadorId?: string) {
  const cacheInicial = leerCacheLocal();
  const [snapshot, setSnapshot] = useState<SnapshotVistaPublica | null>(
    cacheInicial ? cacheInicial.snapshot : null,
  );
  const [cargando, setCargando] = useState<boolean>(cacheInicial === null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [usandoRespaldo, setUsandoRespaldo] = useState<boolean>(false);

  const sincronizar = useCallback(async (forzarRed: boolean) => {
    if (!identificadorId) {
      setCargando(false);
      setErrorMsg('No se encontró ningún identificador en el enlace.');
      return;
    }
    try {
      const { snapshot: nuevo, fromFallback } = await obtenerSnapshotVistaPublica(forzarRed);
      setSnapshot(nuevo);
      setUsandoRespaldo(fromFallback);
      if (!nuevo.qr || !nuevo.qr.estado || nuevo.qr.id_alfanumerico !== identificadorId) {
        setErrorMsg('Este código QR no es válido o ha expirado.');
      } else {
        setErrorMsg('');
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error de conexión con el servidor.',
      );
    } finally {
      setCargando(false);
    }
  }, [identificadorId]);

  useEffect(() => {
    void sincronizar(false);
    const intervalId = window.setInterval(() => {
      void sincronizar(true);
    }, REVALIDATE_INTERVAL_MS);

    const onFocus = () => {
      void sincronizar(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sincronizar(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sincronizar]);

  const qrValido = Boolean(
    snapshot &&
      identificadorId &&
      snapshot.qr &&
      snapshot.qr.estado &&
      snapshot.qr.id_alfanumerico === identificadorId,
  );

  return {
    snapshot,
    cargando,
    qrValido,
    errorMsg,
    usandoRespaldo,
  };
}
