import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { InsumoDisponible } from './tipos';

interface UseInsumosDisponibles {
  insumos: InsumoDisponible[];
  cargando: boolean;
  error: boolean;
  /** Vuelve a pedir la lista (el stock cambia cada vez que se asocia o se quita un insumo). */
  recargar: () => void;
}

/** Insumos activos del maestro que todavía tienen stock, para el modal de asociar insumos. */
export function useInsumosDisponibles(): UseInsumosDisponibles {
  const [insumos, setInsumos] = useState<InsumoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    apiFetch('/lotes/insumos-disponibles')
      .then(async (res) => {
        if (cancelado) return;
        if (res.ok) {
          setInsumos(await res.json());
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return { insumos, cargando, error, recargar };
}
