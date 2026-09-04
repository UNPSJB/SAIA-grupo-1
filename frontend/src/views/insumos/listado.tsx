import React, { useEffect, useState } from 'react';
import type { InsumoConId } from "./tipos";
import '../../styles/listado.css';

interface ListadoInsumosProps {
  onNuevoClick?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoInsumos: React.FC<ListadoInsumosProps> = ({ onNuevoClick }) => {
  const [insumos, setInsumos] = useState<InsumoConId[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/insumos/`); //Revisar con el backend
      if (res.ok) {
        const data = await res.json();
        setInsumos(data);
      } else {
        setInsumos([]);
      }
    } catch {
      // Dejar la lista vacía si el backend no responde
      setInsumos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('¿Seguro que desea eliminar este insumo?')) return;

    try {
      const res = await fetch(`${API_URL}/insumos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInsumos((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      alert('No se pudo eliminar el insumo');
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Insumos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Insumo
          </button>
        )}
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Unidad de medida</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando insumos...
                </td>
              </tr>
            ) : insumos.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay insumos registrados.
                </td>
              </tr>
            ) : (
              insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td>
                  <td>{i.unidad_medida}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button className="btn-icon" title="Ver detalles">
                        👁
                      </button>
                      <button className="btn-icon" title="Editar">
                        ✎
                      </button>
                      <button
                        className="btn-icon"
                        title="Eliminar"
                        onClick={() => handleEliminar(i.id)}
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
