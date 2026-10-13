import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

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
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (certificadoId) {
      const fetchCertificado = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiFetch(`/certificados/${certificadoId}`);
          if (res.ok) {
            const data: Certificado = await res.json();
            setCertificado(data);
          } else {
            setError('El certificado no existe.');
          }
        } catch {
          setError('Error al conectar con el servidor.');
        } finally {
          setLoading(false);
        }
      };

      fetchCertificado();
    }
  }, [certificadoId]);

  const esPdf = certificado?.foto_url?.toLowerCase().endsWith('.pdf');
  const archivoUrl = certificado?.foto_url ? `${API_URL}${certificado.foto_url}` : null;

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle del Certificado</h1>
        <div className="subtitulo">
          {certificado ? `${certificado.tipo} (ID #${certificado.id})` : `ID: ${certificadoId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando certificado...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : certificado ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="id">ID</label>
            <input id="id" type="text" value={certificado.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="tipo">Tipo</label>
            <input id="tipo" type="text" value={certificado.tipo || 'Sin tipo'} disabled />
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
            {certificado.foto_url ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="foto_url"
                  type="text"
                  value=""
                  disabled
                  style={{ width: '100%', margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '12px',
                    transform: 'translateY(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--color-primario-texto)',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <span>{esPdf ? 'Ver documento' : 'Ver imagen'}</span>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>↗</span>
                </button>
              </div>
            ) : (
              <input
                id="foto_url"
                type="text"
                value="Sin archivo adjunto"
                disabled
              />
            )}
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

      <Dialog open={modalAbierto && Boolean(archivoUrl)} onOpenChange={setModalAbierto}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Comprobante de Certificado</DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '72vh',
              overflow: 'hidden',
              borderRadius: '8px',
              backgroundColor: 'var(--color-fondo)',
              border: '1px solid var(--color-borde)',
            }}
          >
            {archivoUrl &&
              (esPdf ? (
                <iframe
                  src={archivoUrl}
                  title="Documento adjunto"
                  style={{
                    width: '100%',
                    height: '65vh',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                />
              ) : (
                <img
                  src={archivoUrl}
                  alt="Comprobante de certificado"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                  }}
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
