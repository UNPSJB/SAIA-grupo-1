import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { Producto } from './tipos';

interface UseProductos {
  /** Todos los productos del ABM (también los dados de baja), ordenados por nombre. */
  productos: Producto[];
  cargando: boolean;
  error: boolean;
}

/** Productos registrados en el ABM de Productos Elaborados, para los selectores de lotes. */
export function useProductos(): UseProductos {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiFetch('/productos/')
      .then(async (res) => {
        if (cancelado) return;
        if (res.ok) {
          const lista: Producto[] = await res.json();
          setProductos(lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })));
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
  }, []);

  return { productos, cargando, error };
}
