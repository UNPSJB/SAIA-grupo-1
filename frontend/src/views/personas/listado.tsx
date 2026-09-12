import React, { useEffect, useState } from 'react';
import type { Persona } from './tipos';
import '../../styles/formularioAlta.css';

interface ListadoPersonasProps {
  onNuevoClick: () => void;
  onDetalleClick: (legajo: number) => void;
  onEditarClick: (legajo: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoPersonas: React.FC<ListadoPersonasProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/personas/`);
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      } else {
        setPersonas([]);
      }
    } catch {
      setPersonas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (legajo?: number) => {
    if (!legajo) return;
    if (!window.confirm(`¿Está seguro de que desea eliminar a la persona con legajo ${legajo}?`)) return;

    try {
      const res = await fetch(`${API_URL}/personas/${legajo}`, { method: 'DELETE' });
      if (res.ok) {
        setPersonas((prev) => prev.filter((p) => p.legajo !== legajo));
      } else {
        alert('No se pudo eliminar la persona.');
      }
    } catch {
      alert('Error al intentar eliminar la persona.');
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Personas</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Persona
          </button>
        )}
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Documento</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Capacidad</th>
              <th>Activo</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando personas...
                </td>
              </tr>
            ) : personas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay personas registradas.
                </td>
              </tr>
            ) : (
              personas.map((p) => (
                <tr key={p.legajo}>
                  <td>{p.legajo}</td>
                  <td>{p.documento}</td>
                  <td>{`${p.apellido}, ${p.nombre}`}</td>
                  <td>{p.email}</td>
                  <td>
                      {p.capacidad === 'ambas'
                        ? 'Operar y Administrar'
                        : p.capacidad
                        ? p.capacidad.charAt(0).toUpperCase() + p.capacidad.slice(1)
                        : 'Ninguna'}
                  </td>
                  <td> {p.activo ? 'Activo' : "Inactivo"} </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon"
                        title="Ver detalles"
                        onClick={() => onDetalleClick(p.legajo)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => onEditarClick(p.legajo)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon"
                        title="Eliminar"
                        onClick={() => handleEliminar(p.legajo)}
                      >
                        🗑
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