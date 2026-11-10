import React, { useEffect, useState } from 'react';
import type { TipoCertificado } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface DetalleTipoCertificadoProps {
  onCancel?: () => void;
  tipoId?: number | null;
}

export const DetalleTipoCertificado: React.FC<DetalleTipoCertificadoProps> = ({
  onCancel,
  tipoId,
}) => {
  const [tipo, setTipo] = useState<TipoCertificado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tipoId) {
      const fetchTipo = async () => {
        try {
          const res = await apiFetch(`/certificados/tipos/${tipoId}`);
          if (res.ok) {
            const data: TipoCertificado = await res.json();
            setTipo(data);
          } else {
            alert('El tipo de certificado no existe.');
          }
        } catch {
          alert('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };

      fetchTipo();
    }
  }, [tipoId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle Tipo de Certificado</h1>
        <div className="subtitulo">ID: {tipoId}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando tipo...</div>
      ) : tipo ? (
        <form>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input id="id" name="id" type="text" value={tipo.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" value={tipo.nombre} disabled />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          El tipo de certificado no existe.
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