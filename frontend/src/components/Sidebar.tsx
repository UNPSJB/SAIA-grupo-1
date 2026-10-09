import React from 'react';
import { useAuth } from '../auth/useAuth';
import { puedeVerModulo } from '../auth/permisos';

export type Modulo = 'dashboard' | 'insumos' | 'equipos' | 'personas' | 'insumos_quimicos' | 'elementosDeLimpieza' | 'planDeLimpieza' | 'checklist' | 'incidentes' | 'auditoria';

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  const { usuario, esAdministrador, logout } = useAuth();

  const todos: { id: Modulo; label: string }[] = [
    { id: 'dashboard', label: 'Inicio' },
    { id: 'insumos', label: 'Ingredientes' },
    { id: 'equipos', label: 'Equipos' },
    { id: 'personas', label: 'Personas' },
    { id: 'insumos_quimicos', label: 'Químicos Limpieza' },
    { id: 'elementosDeLimpieza', label: 'Elementos de Limpieza' },
    { id: 'planDeLimpieza', label: 'Plan de Limpieza' },
    { id: 'checklist', label: 'Checklists' },
    { id: 'incidentes', label: 'Incidentes' },
    { id: 'auditoria', label: 'Auditoría' },
  ];
  const items = todos.filter((item) => puedeVerModulo(item.id, esAdministrador));

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

      {usuario && (
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e202e' }}>
          <div style={{ padding: '0 16px 10px', color: '#8f92a3', fontSize: '13px', lineHeight: 1.4 }}>
            <div style={{ color: '#c9cbd8', fontWeight: 600 }}>
              {usuario.nombre} {usuario.apellido}
            </div>
            <div>{usuario.usuario}</div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: '#8f92a3',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
};