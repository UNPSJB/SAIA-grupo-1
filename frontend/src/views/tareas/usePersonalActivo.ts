import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { Persona } from '../personas/tipos';

/** Usuarios activos del sistema: los únicos que pueden quedar a cargo de una tarea. */
export function usePersonalActivo(): Persona[] {
  const [personal, setPersonal] = useState<Persona[]>([]);

  useEffect(() => {
    let cancelado = false;
    apiFetch('/personal')
      .then(async (res) => {
        if (!cancelado && res.ok) {
          const personas: Persona[] = await res.json();
          setPersonal(personas.filter((p) => p.activo));
        }
      })
      .catch(() => {
        // sin conexión: el selector queda vacío y el formulario no deja guardar
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return personal;
}
