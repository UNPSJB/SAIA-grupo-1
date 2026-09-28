import React, { useEffect, useState } from 'react';
import type { PlanConId } from "./tipos";
import '../../styles/formularioAlta.css';

interface ListadoPlanesProps {
  onNuevoClick?: () => void;
  onDetalleClick?: (id: number) => void;
  onEditarClick?: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoPlanesLimp: React.FC<ListadoPlanesProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [planes, setPlanes] = useState<PlanConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFrecuencia, setFiltroFrecuencia] = useState('TODOS');
  const [filtroTareas, setFiltroTareas] = useState('TODOS');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/plan_De_limpieza/`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setPlanes(data);
        } else {
          if (!ignore) setPlanes([]);
        }
      } catch {
        if (!ignore) setPlanes([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const planesFiltrados = planes.filter((p) => {
    const term = busqueda.toLowerCase();
    const coincideBusqueda =
      (p.nombre?.toLowerCase().includes(term) ?? false) ||
      (p.nombre_equipo?.toLowerCase().includes(term) ?? false);
    const coincideFrecuencia =
      filtroFrecuencia === 'TODOS' ||
      (p.tareas ?? []).some((t) => t.frecuencia?.toUpperCase() === filtroFrecuencia);
    const cantTareas = p.tareas?.length ?? 0;
    const coincideTareas =
      filtroTareas === 'TODOS' ||
      (filtroTareas === 'CON_TAREAS' ? cantTareas > 0 : cantTareas === 0);
    return coincideBusqueda && coincideFrecuencia && coincideTareas;
  });

  const campoFiltroStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: 'var(--code-bg)',
    fontSize: '14px',
    color: 'var(--text-h)',
    outline: 'none',
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Planes de Limpieza</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Crear Plan
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre de plan o equipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...campoFiltroStyle, flex: 1, minWidth: '220px' }}
        />

        <select
          value={filtroFrecuencia}
          onChange={(e) => setFiltroFrecuencia(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
        >
          <option value="TODOS">Todas las frecuencias</option>
          <option value="DIARIA">Con tareas diarias</option>
          <option value="SEMANAL">Con tareas semanales</option>
          <option value="MENSUAL">Con tareas mensuales</option>
        </select>

        <select
          value={filtroTareas}
          onChange={(e) => setFiltroTareas(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
        >
          <option value="TODOS">Todos los planes</option>
          <option value="CON_TAREAS">Con tareas</option>
          <option value="SIN_TAREAS">Sin tareas</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Equipo</th>
              <th>Tareas</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Planes...
                </td>
              </tr>
            ) : planesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron planes.
                </td>
              </tr>
            ) : (
              planesFiltrados.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td>{p.nombre_equipo}</td>
                  <td>{p.tareas?.length}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick?.(p.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(p.id)}
                      >
                        ✎
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
