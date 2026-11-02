import React, { useEffect, useState } from 'react';
import type { MotivoNoRealizado } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface DetalleMotivoProps {
  onCancel?: () => void;
  motivoId?: number | null;
}

export const DetalleMotivo: React.FC<DetalleMotivoProps> = ({
  onCancel,
  motivoId,
}) => {
  const [motivo, setMotivo] = useState<MotivoNoRealizado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (motivoId) {
      const fetchMotivo = async () => {
        try {
          const res = await apiFetch(`/checklist/motivos/${motivoId}`);
          if (res.ok) {
            const data: MotivoNoRealizado = await res.json();
            setMotivo(data);
          } else {
            alert('El motivo no existe.');
          }
        } catch {
          alert('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };

      fetchMotivo();
    }
  }, [motivoId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle Motivo de No Realización</h1>
        <div className="subtitulo">ID: {motivoId}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando motivo...</div>
      ) : motivo ? (
        <form>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input id="id" name="id" type="text" value={motivo.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" value={motivo.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            <input
              id="estado"
              name="estado"
              type="text"
              value={motivo.activo ? 'Activo' : 'Inactivo'}
              disabled
            />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          El motivo no existe.
        </div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};

