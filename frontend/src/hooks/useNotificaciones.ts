import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';

export interface NotificacionItem {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  fecha: string;
  leida: boolean;
  leida_el?: string;
  entidad_tipo?: string;
  entidad_id?: number;
}

interface ListadoResponse {
  items: NotificacionItem[];
  total_no_leidas: number;
  total_registros: number;
}

export function useNotificaciones() {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarNotificaciones = useCallback(async () => {
    if (!usuario) {
      setNotificaciones([]);
      setTotalNoLeidas(0);
      setTotalRegistros(0);
      setCargando(false);
      return;
    }

    try {
      const res = await apiFetch('/notificaciones/');
      if (res.ok) {
        const data: ListadoResponse = await res.json();
        setNotificaciones(data.items || []);
        setTotalNoLeidas(data.total_no_leidas || 0);
        setTotalRegistros(data.total_registros || 0);
        setError(null);
      } else {
        setError('No se pudieron obtener las notificaciones.');
      }
    } catch {
      setError('Error de conexión al cargar notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    let activo = true;
    void Promise.resolve().then(() => {
      if (activo) {
        cargarNotificaciones();
      }
    });

    const intervalo = setInterval(() => {
      if (activo) {
        cargarNotificaciones();
      }
    }, 60000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [cargarNotificaciones]);

  const marcarComoLeida = async (id: number) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
    setTotalNoLeidas((prev) => Math.max(0, prev - 1));

    try {
      await apiFetch(`/notificaciones/${id}/leer`, {
        method: 'PUT',
      });
    } catch {
      cargarNotificaciones();
    }
  };

  const marcarTodasComoLeidas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setTotalNoLeidas(0);

    try {
      await apiFetch('/notificaciones/leer-todas', {
        method: 'PUT',
      });
    } catch {
      cargarNotificaciones();
    }
  };

  return {
    notificaciones,
    totalNoLeidas,
    totalRegistros,
    cargando,
    error,
    refrescar: cargarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
  };
}

