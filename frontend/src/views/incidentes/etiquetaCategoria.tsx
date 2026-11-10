import React from 'react';

export interface EstiloCategoria {
  bg: string;
  color: string;
  border: string;
  dot: string;
}

export function obtenerEstiloCategoria(nombre?: string | null, id?: number | null): EstiloCategoria {
  const paleta: EstiloCategoria[] = [
    { bg: 'color-mix(in srgb, #3b82f6 14%, transparent)', color: '#2563eb', border: 'color-mix(in srgb, #3b82f6 35%, transparent)', dot: '#3b82f6' },
    { bg: 'color-mix(in srgb, #10b981 14%, transparent)', color: '#059669', border: 'color-mix(in srgb, #10b981 35%, transparent)', dot: '#10b981' },
    { bg: 'color-mix(in srgb, #f59e0b 14%, transparent)', color: '#d97706', border: 'color-mix(in srgb, #f59e0b 35%, transparent)', dot: '#f59e0b' },
    { bg: 'color-mix(in srgb, #8b5cf6 14%, transparent)', color: '#7c3aed', border: 'color-mix(in srgb, #8b5cf6 35%, transparent)', dot: '#8b5cf6' },
    { bg: 'color-mix(in srgb, #ef4444 14%, transparent)', color: '#dc2626', border: 'color-mix(in srgb, #ef4444 35%, transparent)', dot: '#ef4444' },
    { bg: 'color-mix(in srgb, #ec4899 14%, transparent)', color: '#db2777', border: 'color-mix(in srgb, #ec4899 35%, transparent)', dot: '#ec4899' },
    { bg: 'color-mix(in srgb, #06b6d4 14%, transparent)', color: '#0891b2', border: 'color-mix(in srgb, #06b6d4 35%, transparent)', dot: '#06b6d4' },
    { bg: 'color-mix(in srgb, #6366f1 14%, transparent)', color: '#4f46e5', border: 'color-mix(in srgb, #6366f1 35%, transparent)', dot: '#6366f1' },
    { bg: 'color-mix(in srgb, #14b8a6 14%, transparent)', color: '#0d9488', border: 'color-mix(in srgb, #14b8a6 35%, transparent)', dot: '#14b8a6' },
  ];

  if (!nombre && !id) {
    return { bg: 'var(--color-fondo)', color: 'var(--color-texto-sec)', border: 'var(--color-borde)', dot: 'var(--color-texto-sec)' };
  }

  const str = (nombre || '').toLowerCase();
  if (str.includes('equip') || str.includes('maq')) return paleta[0];
  if (str.includes('limp') || str.includes('hig')) return paleta[1];
  if (str.includes('edil') || str.includes('instal')) return paleta[2];
  if (str.includes('materia') || str.includes('insum')) return paleta[3];
  if (str.includes('plag')) return paleta[4];
  if (str.includes('conduct') || str.includes('person')) return paleta[5];
  if (str.includes('segurid')) return paleta[6];

  let hash = id ? id * 13 : 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % paleta.length;
  return paleta[index];
}

interface EtiquetaCategoriaProps {
  nombre?: string | null;
  id?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const EtiquetaCategoria: React.FC<EtiquetaCategoriaProps> = ({
  nombre,
  id,
  size = 'md',
  className = '',
  style = {},
}) => {
  const estilo = obtenerEstiloCategoria(nombre, id);
  const texto = nombre || 'Sin categoría';

  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 14px' : '3px 10px';
  const fontSize = size === 'sm' ? '11.5px' : size === 'lg' ? '13.5px' : '12.5px';
  const dotSize = size === 'sm' ? '6px' : size === 'lg' ? '8px' : '7px';

  return (
    <span
      className={`etiqueta-categoria ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '9999px',
        fontSize,
        fontWeight: 600,
        backgroundColor: estilo.bg,
        color: estilo.color,
        border: `1px solid ${estilo.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        letterSpacing: '0.01em',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        ...style,
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: estilo.dot,
          flexShrink: 0,
        }}
      />
      {texto}
    </span>
  );
};

