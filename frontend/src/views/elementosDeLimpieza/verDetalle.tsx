import React, { useEffect, useState } from 'react';
import type { ElementoDeLimpieza } from './tipos';
import '../../styles/formularioAlta.css';

interface DetalleElementoProps {
  onCancel?: () => void;
  elementoId?: number | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const DetalleElementoDeLimpieza: React.FC<DetalleElementoProps> = ({ onCancel, elementoId }) => {
  const [elemento, setElemento] = useState<ElementoDeLimpieza | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (elementoId) {
      const fetchElemento = async () => {
        try {
          const res = await fetch(`${API_URL}/elementosDeLimpieza/${elementoId}`);
          if (res.ok) {
            const data: ElementoDeLimpieza = await res.json();
            setElemento(data);
          } else {
            alert('El elemento de limpieza no existe.');
          }
        } catch {
          alert('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };

      fetchElemento();
    }
  }, [elementoId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle Elemento de Limpieza</h1>
        <div className="subtitulo">ID: {elementoId}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando elemento...</div>
      ) : elemento ? (
        <form>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input
              id="id"
              name="id"
              type="text"
              value={elemento.id}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={elemento.nombre}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="frecuenciaDeCambio">Frecuencia de Cambio</label>
            <input
              id="frecuenciaDeCambio"
              name="frecuenciaDeCambio"
              type="text"
              value={
                elemento.frecuenciaDeCambio !== null && elemento.frecuenciaDeCambio !== undefined
                  ? `${elemento.frecuenciaDeCambio} días`
                  : 'Sin especificar'
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaCambio">Fecha de Cambio</label>
            <input
              id="fechaCambio"
              name="fechaCambio"
              type="text"
              value={
                elemento.fechaCambio !== null && elemento.fechaCambio !== undefined
                  ? `${formatearFecha(elemento.fechaCambio)}`
                  : 'Sin especificar'
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <div style={{ marginTop: '0.25rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#fff',
                  backgroundColor: elemento.activo ? '#16a34a' : '#dc2626',
                  width: 'fit-content',
                }}
              >
                <span>{elemento.activo ? '●' : '○'}</span>
                <span>{elemento.activo ? 'Activo' : 'Inactivo'}</span>
              </span>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El elemento de limpieza no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};