import React, { useState } from 'react';
import type { TipoDocumentoCreate } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface NuevoTipoDocumentoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoTipoDocumento: React.FC<NuevoTipoDocumentoProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TipoDocumentoCreate>({
    nombre: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (name === 'nombre') {
      if (value.length > 50) {
        setAdvertenciaInput('El nombre no puede tener más de 50 caracteres.');
        return;
      }
      setFormData({ nombre: value });
    }
  };

  const handleBlurNombre = () => {
    if (!formData.nombre.trim()) {
      setAdvertenciaInput('El nombre del tipo de documento es obligatorio y no puede estar vacío.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const nombreLimpio = formData.nombre.trim();

    if (!nombreLimpio) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }

    if (nombreLimpio.length > 50) {
      setErrorMsg('El nombre no puede superar los 50 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('nombre', nombreLimpio);

      const response = await apiFetch(`/documentos/tipos/`, {
        method: 'POST',
        body: payload,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detalle = 'Error al registrar el tipo de documento.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        } else if (Array.isArray(data.detail)) {
          detalle = data.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Tipo de documento registrado exitosamente.');
      setFormData({ nombre: '' });

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
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>
          Nuevo Tipo de Documento
        </h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="nombre">
            Nombre <span style={{ color: 'var(--color-error-texto)' }}>*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre (ej: Manual BPM)"
            value={formData.nombre}
            onChange={handleChange}
            onBlur={handleBlurNombre}
            maxLength={50}
            required
          />
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !formData.nombre.trim()}
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

