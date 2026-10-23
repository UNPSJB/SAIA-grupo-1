import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { Producto } from './tipos';

interface UseProductos {
  productos: Producto[];
  cargando: boolean;
  error: boolean;
  /** Vuelve a pedir la lista (por ejemplo después de crear un producto nuevo con un lote). */
  recargar: () => void;
}

/** Productos ya registrados, para el selector del formulario de lotes. */
export function useProductos(): UseProductos {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    apiFetch('/productos/')
      .then(async (res) => {
        if (cancelado) return;
        if (res.ok) {
          setProductos(await res.json());
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

  return { productos, cargando, error, recargar };
}
