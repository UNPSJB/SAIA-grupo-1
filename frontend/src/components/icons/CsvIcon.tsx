import React from 'react';

interface CsvIconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export const CsvIcon: React.FC<CsvIconProps> = ({ className = '', style, size = 18 }) => {
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
      {/* Marco cuadrado con bordes redondeados */}
      <rect x="3" y="4" width="18" height="16" rx="3" />
      {/* Texto CSV centrado */}
      <text
        x="12"
        y="14.8"
        fontSize="7.5"
        fontWeight="800"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        CSV
      </text>
    </svg>
  );
};