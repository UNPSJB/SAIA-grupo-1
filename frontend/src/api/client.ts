export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CLAVE_TOKEN = 'saia_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(CLAVE_TOKEN, token);
    } else {
      localStorage.removeItem(CLAVE_TOKEN);
    }
  } catch {
    // sin localStorage (modo privado, etc.) la sesión dura hasta recargar la página
  }
};

type ManejadorSesionVencida = () => void;
let alVencerSesion: ManejadorSesionVencida | null = null;

/** La sesión (AuthProvider) se registra acá para enterarse cuando el servidor rechaza el token. */
export const registrarAlVencerSesion = (manejador: ManejadorSesionVencida): (() => void) => {
  alVencerSesion = manejador;
  return () => {
    if (alVencerSesion === manejador) alVencerSesion = null;
  };
};

/**
 * Reemplazo de `fetch` para hablar con el backend: recibe la ruta relativa ('/personal'),
 * agrega el token si hay sesión y avisa si el servidor responde 401.
 *
 * No fija Content-Type: cada llamada lo declara (JSON) o lo deja al navegador (FormData).
 */
export async function apiFetch(ruta: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const respuesta = await fetch(`${API_URL}${ruta}`, { ...init, headers });

  if (respuesta.status === 401 && token) {
    // TODO(renovación de token): este es el ÚNICO punto donde se maneja el vencimiento.
    // Acá se intentaría renovar el token y reintentar la request antes de cerrar la sesión.
    alVencerSesion?.();
  }
  return respuesta;
}
