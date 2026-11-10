import { useContext } from 'react';
import { AuthContext } from './contexto';
import type { AuthContextValue } from './contexto';

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return contexto;
}
