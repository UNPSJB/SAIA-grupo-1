import React from 'react';

interface ExportIconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export const ExportIcon: React.FC<ExportIconProps> = ({ className = '', style, size = 18 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: 'middle', display: 'inline-block', ...style }}
    >
      {/* Silueta de hoja doblada en la esquina superior derecha */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      
      {/* Flecha saliente (Exportar / Salida) */}
      <line x1="13" y1="11" x2="9" y2="15" />
      <polyline points="9 11 9 15 13 15" />
    </svg>
  );
};