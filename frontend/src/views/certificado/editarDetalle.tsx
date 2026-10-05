import React, { useEffect, useState } from 'react';
import type { Certificado, CertificadoUpdate } from './tipos';
import '../../styles/formularioAlta.css';

interface EditarCertificadoProps {
  certificadoId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const EditarCertificado: React.FC<EditarCertificadoProps> = ({
  certificadoId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CertificadoUpdate>({
    tipo: '',
    fechaVencimiento: '',
    foto_url: '',
  });

  const [loadingFetch, setLoadingFetch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (certificadoId) {
      const fetchCertificado = async () => {
        try {
          const res = await fetch(`${API_URL}/certificados/${certificadoId}`);
          if (res.ok) {
            const data: Certificado = await res.json();
            setFormData({
              tipo: data.tipo,
              fechaVencimiento: data.fechaVencimiento ? data.fechaVencimiento.split('T')[0] : '',
              foto_url: data.foto_url || '',
            });
          } else {
            setErrorMsg('No se pudo cargar el certificado.');
          }
        } catch {
          setErrorMsg('Error al conectar con el servidor.');
        } finally {
          setLoadingFetch(false);
        }
      };

      fetchCertificado();
    }
  }, [certificadoId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (name === 'tipo') {
      if (value.length > 30) {
        setAdvertenciaInput('El tipo no puede tener más de 30 caracteres.');
        return;
      }
    }

    if (name === 'fechaVencimiento' && value) {
      const fechaIngresada = new Date(`${value}T00:00:00`);
      const fechaMinima = new Date();
      fechaMinima.setDate(fechaMinima.getDate() + 7);
      fechaMinima.setHours(0, 0, 0, 0);

      if (fechaIngresada < fechaMinima) {
        setAdvertenciaInput('La fecha de vencimiento debe ser al menos dentro de 7 días.');
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificadoId) return;

    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const tipoLimpio = formData.tipo?.trim();
    if (!tipoLimpio) {
      setErrorMsg('El tipo no puede estar vacío.');
      return;
    }

    if (formData.fechaVencimiento) {
      const fechaIngresada = new Date(`${formData.fechaVencimiento}T00:00:00`);
      const fechaMinima = new Date();
      fechaMinima.setDate(fechaMinima.getDate() + 7);
      fechaMinima.setHours(0, 0, 0, 0);

      if (fechaIngresada < fechaMinima) {
        setErrorMsg('La fecha de vencimiento no puede ser anterior a dentro de 7 días.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        tipo: tipoLimpio,
        fechaVencimiento: formData.fechaVencimiento ? `${formData.fechaVencimiento}T00:00:00` : undefined,
        foto_url: formData.foto_url?.trim() ? formData.foto_url.trim() : null,
      };

      const res = await fetch(`${API_URL}/certificados/${certificadoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let detalle = 'Error al actualizar el certificado';
        if (typeof errData.detail === 'string') {
          detalle = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          detalle = errData.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Certificado actualizado exitosamente');
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loadingFetch) {
    return (
      <div className="modulo-container formulario-box">
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>Editar Certificado</h1>
        <div className="subtitulo">ID: {certificadoId}</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="tipo">
            Tipo de Certificado <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="tipo"
            name="tipo"
            type="text"
            value={formData.tipo || ''}
            onChange={handleChange}
            maxLength={30}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">
            Fecha de Vencimiento <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            value={formData.fechaVencimiento || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="foto_url">Ruta o Archivo Comprobante</label>
          <input
            id="foto_url"
            name="foto_url"
            type="text"
            value={formData.foto_url || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !formData.tipo?.trim()}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};