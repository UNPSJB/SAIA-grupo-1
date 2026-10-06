import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch, getToken, registrarAlVencerSesion, setToken } from '../api/client';
import { AuthContext } from './contexto';
import type { AuthContextValue, Usuario } from './contexto';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(() => getToken() !== null);
  const [aviso, setAviso] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUsuario(null);
    setAviso(null);
  }, []);

  // El servidor rechazó el token (venció o la persona fue dada de baja): volvemos al login.
  useEffect(
    () =>
      registrarAlVencerSesion(() => {
        setToken(null);
        setUsuario(null);
        setAviso('Tu sesión venció. Ingresá de nuevo.');
      }),
    []
  );

  // Al abrir la app, si quedó un token guardado, lo validamos y recuperamos a la persona.
  useEffect(() => {
    if (getToken() === null) return;
    let cancelado = false;

    apiFetch('/autenticacion/me')
      .then(async (res) => {
        if (!cancelado && res.ok) setUsuario(await res.json());
      })
      .catch(() => {
        // sin conexión con el servidor: se muestra el login sin tirar el token
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const login = useCallback(async (nombreUsuario: string, contrasenia: string) => {
    setToken(null); // nunca mandar un token viejo al iniciar sesión

    // El backend usa el formulario estándar de OAuth2: el campo del usuario se llama "username".
    const cuerpo = new URLSearchParams({ username: nombreUsuario, password: contrasenia });

    let res: Response;
    try {
      res = await apiFetch('/autenticacion/login', { method: 'POST', body: cuerpo });
    } catch {
      throw new Error('No se pudo conectar con el servidor.');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(typeof error?.detail === 'string' ? error.detail : 'No se pudo iniciar sesión.');
    }

    const datos: { access_token: string; persona: Usuario } = await res.json();
    setToken(datos.access_token);
    setAviso(null);
    setUsuario(datos.persona);
  }, []);

  const valor = useMemo<AuthContextValue>(() => {
    const capacidad = usuario?.capacidad;
    return {
      usuario,
      cargando,
      aviso,
      esAdministrador: capacidad === 'ADMINISTRAR' || capacidad === 'AMBAS',
      esOperador: capacidad === 'OPERAR' || capacidad === 'AMBAS',
      login,
      logout,
    };
  }, [usuario, cargando, aviso, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
