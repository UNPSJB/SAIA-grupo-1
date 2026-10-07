import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { Persona } from '../personas/tipos';

/** Usuarios activos del sistema: los únicos que pueden quedar como responsables de una tarea. */
export function useResponsables(): Persona[] {
  const [responsables, setResponsables] = useState<Persona[]>([]);

  useEffect(() => {
    let cancelado = false;
    apiFetch('/personal')
      .then(async (res) => {
        if (!cancelado && res.ok) {
          const personas: Persona[] = await res.json();
          setResponsables(personas.filter((p) => p.activo));
        }
      })
      .catch(() => {
        // sin conexión: el selector queda vacío y el formulario no deja guardar
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return responsables;
}
