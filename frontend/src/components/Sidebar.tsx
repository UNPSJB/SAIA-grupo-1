import React from 'react';
import '../styles/sidebar.css';

export type SeccionApp = 'insumos' | 'equipos' | 'personas' | 'insumos_quimicos';

interface SidebarProps {
  seccionActual: SeccionApp;
  onCambiarSeccion: (seccion: SeccionApp) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ seccionActual, onCambiarSeccion }) => {
  return (
    <aside className="w-56 bg-white min-h-screen p-4 flex flex-col gap-2 border-r border-gray-200 shadow-sm">

      <button
        onClick={() => onCambiarSeccion('insumos')}
        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          seccionActual === 'insumos'
            ? 'bg-[#f4effe] text-[#7c3aed] font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Insumos
      </button>

      <button
        onClick={() => onCambiarSeccion('equipos')}
        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          seccionActual === 'equipos'
            ? 'bg-[#f4effe] text-[#7c3aed] font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Equipos
      </button>

      <button
        onClick={() => onCambiarSeccion('personas')}
        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          seccionActual === 'personas'
            ? 'bg-[#f4effe] text-[#7c3aed] font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Personas
      </button>

      <button
        onClick={() => onCambiarSeccion('insumos_quimicos')}
        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          seccionActual === 'insumos_quimicos'
            ? 'bg-[#f4effe] text-[#7c3aed] font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Químicos Limpieza
      </button>
    </aside>
  );
};