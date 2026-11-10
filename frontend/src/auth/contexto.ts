import { createContext } from 'react';

export type Capacidad = 'OPERAR' | 'ADMINISTRAR' | 'AMBAS';

export interface Usuario {
  legajo: number;
  nombre: string;
  apellido: string;
  usuario: string;
  email: string;
  capacidad: Capacidad;
}

export interface AuthContextValue {
  usuario: Usuario | null;
  /** true mientras se valida un token guardado al abrir la app */
  cargando: boolean;
  /** mensaje para mostrar en el login (por ejemplo, "Tu sesión venció") */
  aviso: string | null;
  esAdministrador: boolean;
  esOperador: boolean;
  /** Lanza un Error con el mensaje a mostrar si no se puede iniciar sesión. */
  login: (usuario: string, contrasenia: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
