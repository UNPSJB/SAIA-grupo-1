import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { registrarAlertaErrorHttp } from '../api/client';
import { ErrorAlertDialog, SuccessAlertDialog } from '../components/ui/alert-dialog';

type TipoAlertaOperacion = 'exito' | 'error';

interface AlertaOperacion {
  tipo: TipoAlertaOperacion;
  titulo: string;
  descripcion: string;
  duracionMs: number;
}

interface AlertaOperacionContextValue {
  mostrarExito: (titulo: string, descripcion?: string, duracionMs?: number, alCerrar?: () => void) => void;
  mostrarError: (titulo: string, descripcion: string, duracionMs?: number) => void;
  cerrarAlerta: () => void;
}

const AlertaOperacionContext = createContext<AlertaOperacionContextValue | null>(null);

export function AlertaOperacionProvider({ children }: { children: React.ReactNode }) {
  const [alerta, setAlerta] = useState<AlertaOperacion | null>(null);
  const alCerrarRef = useRef<(() => void) | null>(null);

  const cerrarAlerta = useCallback(() => {
    const alCerrar = alCerrarRef.current;
    alCerrarRef.current = null;
    setAlerta(null);
    alCerrar?.();
  }, []);

  const mostrarExito = useCallback((
    titulo: string,
    descripcion = 'La operación se completó correctamente.',
    duracionMs = 5000,
    alCerrar: (() => void) | undefined = undefined,
  ) => {
    alCerrarRef.current = alCerrar ?? null;
    setAlerta({ tipo: 'exito', titulo, descripcion, duracionMs });
  }, []);

  const mostrarError = useCallback((
    titulo: string,
    descripcion: string,
    duracionMs = 5000,
  ) => {
    setAlerta({ tipo: 'error', titulo, descripcion, duracionMs });
  }, []);

  useEffect(() => registrarAlertaErrorHttp((estado, mensaje) => {
    const titulos: Record<number, string> = {
      400: 'Datos inválidos',
      401: 'Sesión no autorizada',
      403: 'Acceso denegado',
      500: 'Error del servidor',
    };
    mostrarError(titulos[estado] || 'No se pudo completar la acción', mensaje);
  }), [mostrarError]);

  useEffect(() => {
    if (!alerta || alerta.duracionMs <= 0) return;
    const temporizador = window.setTimeout(cerrarAlerta, alerta.duracionMs);
    return () => window.clearTimeout(temporizador);
  }, [alerta, cerrarAlerta]);

  const valor = useMemo(
    () => ({ mostrarExito, mostrarError, cerrarAlerta }),
    [mostrarExito, mostrarError, cerrarAlerta],
  );

  return (
    <AlertaOperacionContext.Provider value={valor}>
      {children}
      {alerta?.tipo === 'exito' && (
        <SuccessAlertDialog
          open
          title={alerta.titulo}
          description={alerta.descripcion}
          onClose={cerrarAlerta}
          autoCloseMs={0}
        />
      )}
      {alerta?.tipo === 'error' && (
        <ErrorAlertDialog
          open
          title={alerta.titulo}
          description={alerta.descripcion}
          onClose={cerrarAlerta}
          autoCloseMs={0}
        />
      )}
    </AlertaOperacionContext.Provider>
  );
}

export function useAlertaOperacion(): AlertaOperacionContextValue {
  const contexto = useContext(AlertaOperacionContext);
  if (!contexto) {
    throw new Error('useAlertaOperacion debe usarse dentro de AlertaOperacionProvider');
  }
  return contexto;
}
