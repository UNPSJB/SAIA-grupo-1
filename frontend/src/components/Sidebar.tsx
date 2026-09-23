import React from 'react';

export type Modulo = 'insumos' | 'equipos' | 'personas' | 'insumos_quimicos';

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  const items: { id: Modulo; label: string }[] = [
    { id: 'insumos', label: 'Insumos' },
    { id: 'equipos', label: 'Equipos' },
    { id: 'personas', label: 'Personas' },
    { id: 'insumos_quimicos', label: 'Químicos Limpieza' },
  ];

  return (
    <aside
      style={{
        width: '210px',
        minWidth: '210px',
        minHeight: '100vh',
        backgroundColor: '#12131d',
        borderRight: '1px solid #1e202e',
        padding: '24px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxSizing: 'border-box',
      }}
    >
      {items.map((item) => {
        const esActivo = moduloActivo === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onCambiarModulo(item.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: esActivo ? '600' : '400',
              backgroundColor: esActivo ? '#2d224d' : 'transparent',
              color: esActivo ? '#c084fc' : '#8f92a3',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </aside>
  );
};