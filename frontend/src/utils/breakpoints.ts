import { useEffect, useState } from 'react';

/*
 * Cortes responsive del sistema. Son los mismos que usa src/styles/responsive.css:
 * si se cambia uno, cambiar el otro.
 */
export const BREAKPOINTS = {
  movil: 640,
  tablet: 1024,
} as const;

export const MEDIA_MOVIL = `(max-width: ${BREAKPOINTS.movil}px)`;
export const MEDIA_TABLET = `(max-width: ${BREAKPOINTS.tablet}px)`;

/* Devuelve true mientras la pantalla cumpla la media query */
export function useMediaQuery(query: string): boolean {
  const [coincide, setCoincide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const actualizar = () => setCoincide(mql.matches);
    actualizar();
    mql.addEventListener('change', actualizar);
    return () => mql.removeEventListener('change', actualizar);
  }, [query]);

  return coincide;
}

export const useEsMovil = () => useMediaQuery(MEDIA_MOVIL);
export const useEsTablet = () => useMediaQuery(MEDIA_TABLET);
