import React, { useEffect, useState } from 'react';
import type { ElementoDeLimpieza } from './tipos';
import '../../styles/formularioAlta.css';

interface ListadoElementosLimpiezaProps {
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
  onEditarClick: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoElementosLimpieza: React.FC<ListadoElementosLimpiezaProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [elementos, setElementos] = useState<ElementoDeLimpieza[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchElementos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/elementosDeLimpieza/`);
      if (res.ok) {
        const data = await res.json();
        setElementos(data);
      } else {
        setElementos([]);
      }
    } catch {
      setElementos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id?: number) => {
    if (!id) return;
    if (!window.confirm(`¿Está seguro de que desea dar de baja el elemento con ID ${id}?`)) return;

    try {
      const res = await fetch(`${API_URL}/elementosDeLimpieza/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Al ser baja lógica (activo: false), actualizamos el registro en el estado local
        setElementos((prev) =>
          prev.map((item) => (item.id === id ? { ...item, activo: false } : item))
        );
      } else {
        alert('No se pudo desactivar el elemento.');
      }
    } catch {
      alert('Error al conectar con el servidor.');
    }
  };

  useEffect(() => {
    fetchElementos();
  }, []);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Elementos de Limpieza</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Elemento
          </button>
        )}
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Frecuencia de Cambio</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando elementos de limpieza...
                </td>
              </tr>
            ) : elementos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay elementos de limpieza registrados.
                </td>
              </tr>
            ) : (
              elementos.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.nombre}</td>
                  <td>
                    {item.frecuenciaDeCambio !== null && item.frecuenciaDeCambio !== undefined
                      ? `${item.frecuenciaDeCambio} días`
                      : 'Sin especificar'}
                  </td>
                  <td>{item.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon"
                        title="Ver detalles"
                        onClick={() => onDetalleClick(item.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => onEditarClick(item.id)}
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