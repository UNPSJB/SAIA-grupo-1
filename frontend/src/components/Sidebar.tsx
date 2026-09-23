import React from 'react';
import '../styles/sidebar.css';

export type Modulo = 'insumos' | 'equipos' | 'personas' | 'checklist';

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  return (
    <nav className="sidebar">
      <button
        title="Insumos"
        onClick={() => onCambiarModulo('insumos')}
        className={moduloActivo === 'insumos' ? 'sidebar-item activo' : 'sidebar-item'}
      >
        Insumos
      </button>
      <button
        title="Equipos"
        onClick={() => onCambiarModulo('equipos')}
        className={moduloActivo === 'equipos' ? 'sidebar-item activo' : 'sidebar-item'}
      >
        Equipos
      </button>
      <button
        title="Personas"
        onClick={() => onCambiarModulo('personas')}
        className={moduloActivo === 'personas' ? 'sidebar-item activo' : 'sidebar-item'}
      >
        Personas
      </button>
      <button
        title="Checklists"
        onClick={() => onCambiarModulo('checklist')}
        className={moduloActivo === 'checklist' ? 'sidebar-item activo' : 'sidebar-item'}
      >
        Checklists
      </button>
    </nav>
  );
};
