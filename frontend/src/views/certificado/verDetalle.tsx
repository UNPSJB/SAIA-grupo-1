import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface DetalleCertificadoProps {
  onCancel?: () => void;
  certificadoId?: number | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const DetalleCertificado: React.FC<DetalleCertificadoProps> = ({
  onCancel,
  certificadoId,
}) => {
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certificadoId) {
      const fetchCertificado = async () => {
        try {
          const res = await apiFetch(`/certificados/${certificadoId}`);
          if (res.ok) {
            const data: Certificado = await res.json();
            setCertificado(data);
          } else {
            alert('El certificado no existe.');
          }
        } catch {
          alert('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };

      fetchCertificado();
    }
  }, [certificadoId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle del Certificado</h1>
        <div className="subtitulo">ID: {certificadoId}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando certificado...</div>
      ) : certificado ? (
        <form>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input id="id" type="text" value={certificado.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="tipo">Tipo</label>
            <input id="tipo" type="text" value={certificado.tipo} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="legajo">Legajo de Personal</label>
            <input id="legajo" type="text" value={certificado.legajo_persona} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="fechaVencimiento">Fecha de Vencimiento</label>
            <input
              id="fechaVencimiento"
              type="text"
              value={formatearFecha(certificado.fechaVencimiento)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="foto_url">Archivo / Comprobante</label>
            <input
              id="foto_url"
              type="text"
              value={certificado.foto_url || 'Sin archivo adjunto'}
              disabled
            />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El certificado no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};