import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { Capacidad } from '../../auth/contexto';

export interface Operador {
  legajo: number;
  nombre: string;
  apellido: string;
}

interface PersonalApi extends Operador {
  activo: boolean;
  capacidad: Capacidad;
}

/**
 * Personal activo que puede ejecutar tareas: son los únicos a quienes se les puede asignar una.
 * El listado de personal es solo para administradores; con `habilitado` en false no se pide.
 */
export function useOperadores(habilitado: boolean = true): Operador[] {
  const [operadores, setOperadores] = useState<Operador[]>([]);

  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/personal/`);
        if (!res.ok || cancelado) return;
        const data: PersonalApi[] = await res.json();
        setOperadores(
          data.filter((p) => p.activo && (p.capacidad === 'OPERAR' || p.capacidad === 'AMBAS'))
        );
      } catch {
        if (!cancelado) setOperadores([]);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [habilitado]);

  return operadores;
}

export const nombreOperador = (o: Operador): string => `${o.nombre} ${o.apellido}`;
