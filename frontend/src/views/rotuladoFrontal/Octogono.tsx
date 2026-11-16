import React from 'react';
import '../../styles/rotulado.css';

interface OctogonoProps {
  leyenda: string;
  tamano?: number;
}

// octógono regular inscripto en 100 x 100
const PUNTOS = '29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3';
const PUNTOS_INTERIOR = '30.9,4 69.1,4 96,30.9 96,69.1 69.1,96 30.9,96 4,69.1 4,30.9';

/** Separa "EXCESO EN GRASAS TOTALES" en ["EXCESO EN", "GRASAS", "TOTALES"]. */
const partirLeyenda = (leyenda: string): { encabezado: string | null; palabras: string[] } => {
  const texto = leyenda.trim().toUpperCase();
  const m = texto.match(/^(EXCESO EN)\s+(.+)$/);
  if (m) return { encabezado: m[1], palabras: m[2].split(/\s+/) };
  return { encabezado: null, palabras: texto.split(/\s+/) };
};

/** Sello de advertencia del rotulado frontal: octógono negro con borde blanco y la leyenda de la regla. */
export const Octogono: React.FC<OctogonoProps> = ({ leyenda, tamano = 110 }) => {
  const { encabezado, palabras } = partirLeyenda(leyenda);
  const lineas = [...(encabezado ? [encabezado] : []), ...palabras];
  const altoLinea = 15;
  const inicio = 50 - ((lineas.length - 1) * altoLinea) / 2;

  return (
    <svg
      className="rot-octogono"
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      role="img"
      aria-label={leyenda}
    >
      <title>{leyenda}</title>
      <polygon points={PUNTOS} fill="#000" />
      <polygon points={PUNTOS_INTERIOR} fill="none" stroke="#fff" strokeWidth="2.5" />
      {lineas.map((linea, i) => {
        const esEncabezado = Boolean(encabezado) && i === 0;
        const base = esEncabezado ? 11 : 14;
        // achica las palabras largas para que entren en el ancho útil (~78)
        const tamanoFuente = Math.min(base, 78 / (linea.length * 0.66));
        return (
          <text
            key={i}
            x="50"
            y={inicio + i * altoLinea}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight={esEncabezado ? 700 : 900}
            fontSize={tamanoFuente}
          >
            {linea}
          </text>
        );
      })}
    </svg>
  );
};

interface ListaSellosProps {
  /** leyendas de los sellos que corresponden (ver leyendasDeSellos en tipos.ts) */
  leyendas: string[];
  tamano?: number;
}

export const ListaSellos: React.FC<ListaSellosProps> = ({ leyendas, tamano }) =>
  leyendas.length === 0 ? (
    <span className="rot-sin-sellos">✓ Sin sellos de advertencia</span>
  ) : (
    <div className="rot-sellos">
      {leyendas.map((l) => (
        <Octogono key={l} leyenda={l} tamano={tamano} />
      ))}
    </div>
  );
