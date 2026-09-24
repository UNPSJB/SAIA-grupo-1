import React, { useState } from 'react';
import type { ElementoDeLimpiezaCreate } from './tipos';
import '../../styles/formularioAlta.css';

interface NuevoElementoLimpiezaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NuevoElementoDeLimpieza: React.FC<NuevoElementoLimpiezaProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ElementoDeLimpiezaCreate>({
    nombre: '',
    frecuenciaDeCambio: null,
  });

  const [frecuenciaInput, setFrecuenciaInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (name === 'nombre') {
      if (value.length > 20) {
        setAdvertenciaInput('El nombre no puede tener más de 20 caracteres.');
        return;
      }
      setFormData((prev) => ({ ...prev, nombre: value }));
      return;
    }

    if (name === 'frecuenciaDeCambio') {
      setFrecuenciaInput(value);
      if (value === '') {
        setFormData((prev) => ({ ...prev, frecuenciaDeCambio: null }));
        return;
      }

      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        setAdvertenciaInput('La frecuencia de cambio debe ser un número mayor a 0.');
      }
      setFormData((prev) => ({ ...prev, frecuenciaDeCambio: isNaN(num) ? null : num }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlurNombre = () => {
    if (!formData.nombre.trim()) {
      setAdvertenciaInput('El nombre del elemento es obligatorio y no puede estar vacío.');
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

    if (nombreLimpio.length > 20) {
      setErrorMsg('El nombre no puede superar los 20 caracteres.');
      return;
    }

    if (formData.frecuenciaDeCambio !== null && formData.frecuenciaDeCambio !== undefined) {
      if (formData.frecuenciaDeCambio <= 0) {
        setErrorMsg('La frecuencia de cambio debe ser mayor a 0 días.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        nombre: nombreLimpio,
        frecuenciaDeCambio: formData.frecuenciaDeCambio,
      };

      const response = await fetch(`${API_URL}/elementosDeLimpieza/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detalle = 'Error al registrar el elemento de limpieza.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        } else if (Array.isArray(data.detail)) {
          detalle = data.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Elemento de limpieza dado de alta exitosamente.');
      setFormData({ nombre: '', frecuenciaDeCambio: null });
      setFrecuenciaInput('');

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
        <h1>Nuevo Elemento de Limpieza</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="nombre">
            Nombre <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={handleChange}
            onBlur={handleBlurNombre}
            maxLength={20}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="frecuenciaDeCambio">Frecuencia de Cambio (en días)</label>
          <input
            id="frecuenciaDeCambio"
            name="frecuenciaDeCambio"
            type="number"
            step="1"
            min="1"
            placeholder="Opcional"
            value={frecuenciaInput}
            onChange={handleChange}
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