import React from 'react';
import '../styles/sidebar.css';


type Modulo = 'insumos' | 'equipos';

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  return (
    <nav className="sidebar">
        <button title='Insumos' onClick={() => onCambiarModulo('insumos')} className={moduloActivo === 'insumos' ? 'sidebar-item activo' : 'sidebar-item'}>
            Insumos
        </button>
        <button title='Equipos' onClick={() => onCambiarModulo('equipos')} className={moduloActivo === 'equipos' ? 'sidebar-item activo' : 'sidebar-item'}>
            Equipos
        </button>
    </nav>
  );
};
