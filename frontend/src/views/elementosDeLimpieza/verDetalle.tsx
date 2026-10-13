import React, { useEffect, useState } from 'react';
import type { ElementoDeLimpieza } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';

interface DetalleElementoProps {
  onCancel?: () => void;
  elementoId?: number | null;
}

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

export const DetalleElementoDeLimpieza: React.FC<DetalleElementoProps> = ({
  onCancel,
  elementoId,
}) => {
  const [elemento, setElemento] = useState<ElementoDeLimpieza | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (elementoId) {
      const fetchElemento = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiFetch(`/elementosDeLimpieza/${elementoId}`);
          if (res.ok) {
            const data: ElementoDeLimpieza = await res.json();
            setElemento(data);
          } else {
            setError('El elemento de limpieza no existe.');
          }
        } catch {
          setError('Error al conectar con el servidor.');
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
        <h1>Detalle de Elemento de Limpieza</h1>
        <div className="subtitulo">
          {elemento ? `${elemento.nombre} (ID #${elemento.id})` : `ID: ${elementoId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando elemento...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : elemento ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input id="id" name="id" type="text" value={elemento.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" value={elemento.nombre} disabled />
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
            <div>
              <Badge variant={elemento.activo ? 'activo' : 'inactivo'}>
                {elemento.activo ? 'Activo' : 'Inactivo'}
              </Badge>
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