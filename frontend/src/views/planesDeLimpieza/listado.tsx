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
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Planes...
                </td>
              </tr>
            ) : planes.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay Planes registrados.
                </td>
              </tr>
            ) : (
              planes.map((p) => (
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
