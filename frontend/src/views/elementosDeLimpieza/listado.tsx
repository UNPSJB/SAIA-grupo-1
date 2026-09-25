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

  useEffect(() => {
    fetchElementos();
  }, []);

  // Formatear la fecha que viene en formato ISO desde el backend
  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const d = new Date(fechaStr);
      return isNaN(d.getTime())
        ? fechaStr
        : d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
    } catch {
      return fechaStr;
    }
  };

  // Chequea si la fecha ya expiró para resaltar la alerta
  const estaVencido = (fechaStr?: string | null) => {
    if (!fechaStr) return false;
    const fechaLimite = new Date(fechaStr);
    return new Date() >= fechaLimite;
  };

  const handleEfectuarCambio = async (id: number, nombre: string) => {
    const confirmacion = window.confirm(`¿Confirmar que cambiaste "${nombre}"? Se actualizará la próxima fecha.`);
    if (!confirmacion) return;

    try {
      const res = await fetch(`${API_URL}/elementosDeLimpieza/${id}/cambiar`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const elementoActualizado: ElementoDeLimpieza = await res.json();
      
        // Actualizamos la fila en la tabla sin recargar toda la página
        setElementos((prev) =>
          prev.map((elem) => (elem.id === id ? elementoActualizado : elem))
        );
      } else {
        alert('No se pudo registrar el cambio.');
      }
    } catch {
      alert('Error al conectar con el servidor.');
    }
  };

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
              <th>Próximo Recambio</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando elementos de limpieza...
                </td>
              </tr>
            ) : elementos.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay elementos de limpieza registrados.
                </td>
              </tr>
            ) : (
              elementos.map((item) => {
                const vencido = estaVencido(item.fechaCambio);

                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.nombre}</td>
                    <td>
                      {item.frecuenciaDeCambio !== null && item.frecuenciaDeCambio !== undefined
                        ? `${item.frecuenciaDeCambio} días`
                        : 'Sin especificar'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{formatearFecha(item.fechaCambio)}</span>
                        {item.fechaCambio && vencido && (
                          <span
                            title="Recambio requerido"
                            style={{
                              backgroundColor: 'rgba(220, 38, 38, 0.2)',
                              color: '#dc2626',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ Requiere cambio
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{item.activo ? 'Activo' : 'Inactivo'}</td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        {item.frecuenciaDeCambio && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Efectuar cambio (actualizar fecha)"
                            onClick={() => handleEfectuarCambio(item.id, item.nombre)}
                          >
                            ↻
                          </button>
                        )}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};