import React, { useEffect, useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';

interface DetalleEquipoProps {
  onCancel?: () => void;
  equipoId?: number | null;
}

export const DetalleEquipo: React.FC<DetalleEquipoProps> = ({ onCancel, equipoId }) => {
  const [equipo, setEquipo] = useState<EquipoConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (equipoId) {
      const fetchEquipo = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiFetch(`/equipos/${equipoId}`);
          if (res.ok) {
            const data = await res.json();
            setEquipo(data);
          } else {
            setError('El equipo no existe.');
          }
        } catch {
          setError('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };
      fetchEquipo();
    }
  }, [equipoId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Equipo</h1>
        <div className="subtitulo">
          {equipo ? `${equipo.nombre} (ID #${equipo.id})` : `Equipo: ${equipoId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando equipo...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : equipo ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={equipo.nombre}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              value={equipo.categoria}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="ubicacion">Ubicación</label>
            <input
              id="ubicacion"
              name="ubicacion"
              type="text"
              value={equipo.ubicacion?.nombre || ''}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_de_Limpieza">Plan de Limpieza</label>
            <input
              id="plan_de_Limpieza"
              name="plan_de_Limpieza"
              type="text"
              value={equipo.plan_de_Limpieza?.nombre || 'Sin plan asignado'}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
            <input
              id="plan_de_calibracion"
              name="plan_de_calibracion"
              type="text"
              value={equipo.plan_de_calibracion?.nombre || 'Sin plan asignado'}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <div>
              <Badge variant={equipo.estado?.toLowerCase() === 'activo' ? 'activo' : 'inactivo'}>
                {equipo.estado?.toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          <div className="form-acciones">
            <button
              type="button"
              className="btn-cancelar"
              onClick={onCancel}
            >
              Volver
            </button>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El equipo no existe.</div>
      )}
    </div>
  );
};