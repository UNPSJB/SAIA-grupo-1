import React, { useState } from 'react';
import type { CertificadoCreate } from './tipos';
import '../../styles/formularioAlta.css';

interface NuevoCertificadoProps {
  legajoPersona: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NuevoCertificado: React.FC<NuevoCertificadoProps> = ({
  legajoPersona,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CertificadoCreate>({
    tipo: '',
    fechaVencimiento: '',
    foto_url: '',
    legajo_persona: legajoPersona,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleBlurTipo = () => {
    if (!formData.tipo.trim()) {
      setAdvertenciaInput('El tipo de certificado es obligatorio.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const tipoLimpio = formData.tipo.trim();

    if (!tipoLimpio) {
      setErrorMsg('El tipo de certificado no puede estar vacío.');
      return;
    }

    if (tipoLimpio.length > 30) {
      setErrorMsg('El tipo de certificado no puede superar los 30 caracteres.');
      return;
    }

    if (!formData.fechaVencimiento) {
      setErrorMsg('Debe indicar una fecha de vencimiento.');
      return;
    }

    const fechaIngresada = new Date(`${formData.fechaVencimiento}T00:00:00`);
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    fechaMinima.setHours(0, 0, 0, 0);

    if (fechaIngresada < fechaMinima) {
      setErrorMsg('La fecha de vencimiento no puede ser anterior a dentro de 7 días.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tipo: tipoLimpio,
        fechaVencimiento: `${formData.fechaVencimiento}T00:00:00`,
        foto_url: formData.foto_url?.trim() ? formData.foto_url.trim() : null,
        legajo_persona: legajoPersona,
      };

      const response = await fetch(`${API_URL}/certificados/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detalle = 'Error al registrar el certificado.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        } else if (Array.isArray(data.detail)) {
          detalle = data.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Certificado dado de alta exitosamente.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>Nuevo Certificado</h1>
        <div className="subtitulo">Legajo: {legajoPersona}</div>
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
            placeholder="Ej: Carnet Manipulador, Curso Seg..."
            value={formData.tipo}
            onChange={handleChange}
            onBlur={handleBlurTipo}
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
            value={formData.fechaVencimiento}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="foto_url">Ruta o Archivo Comprobante (Opcional)</label>
          <input
            id="foto_url"
            name="foto_url"
            type="text"
            placeholder="Ej: /archivos/comprobante.pdf"
            value={formData.foto_url || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !formData.tipo.trim() || !formData.fechaVencimiento}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-cancelar">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};