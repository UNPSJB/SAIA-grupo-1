import { useEffect, useState } from 'react';

/**
 * Colores de la paleta (styles/tema.css) como valores concretos.
 *
 * Recharts escribe los colores como atributos del SVG (fill, stroke), y ahí var(--...) no se
 * resuelve de forma confiable; por eso los leemos ya calculados. Se vuelven a leer cuando
 * cambia el tema (atributo data-theme de <html>), así los gráficos acompañan al modo oscuro.
 */
export interface ColoresTema {
  primario: string;
  exito: string;
  alerta: string;
  error: string;
  borde: string;
  suave: string;
  textoSec: string;
}

const leerColores = (): ColoresTema => {
  const estilos = getComputedStyle(document.documentElement);
  const token = (nombre: string) => estilos.getPropertyValue(`--color-${nombre}`).trim();
  return {
    primario: token('primario'),
    exito: token('exito'),
    alerta: token('alerta'),
    error: token('error'),
    borde: token('borde'),
    suave: token('suave'),
    textoSec: token('texto-sec'),
  };
};

export function useColoresTema(): ColoresTema {
  const [colores, setColores] = useState<ColoresTema>(leerColores);

  useEffect(() => {
    const observador = new MutationObserver(() => setColores(leerColores()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observador.disconnect();
  }, []);

  return colores;
}