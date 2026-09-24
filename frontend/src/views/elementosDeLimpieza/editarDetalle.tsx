import React, { useEffect, useState } from 'react';
import type { ElementoDeLimpieza, ElementoDeLimpiezaUpdate } from './tipos';
import '../../styles/formularioAlta.css';

interface EditarElementoProps {
  elementoId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const EditarElementoDeLimpieza: React.FC<EditarElementoProps> = ({
  elementoId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ElementoDeLimpiezaUpdate>({
    nombre: '',
    frecuenciaDeCambio: null,
    activo: true,
  });

  const [frecuenciaInput, setFrecuenciaInput] = useState<string>('');
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (elementoId) {
      const fetchElemento = async () => {
        try {
          const res = await fetch(`${API_URL}/elementosDeLimpieza/${elementoId}`);
          if (res.ok) {
            const data: ElementoDeLimpieza = await res.json();
            setFormData({
              nombre: data.nombre,
              frecuenciaDeCambio: data.frecuenciaDeCambio ?? null,
              activo: data.activo,
            });
            setFrecuenciaInput(
              data.frecuenciaDeCambio !== null && data.frecuenciaDeCambio !== undefined
                ? String(data.frecuenciaDeCambio)
                : ''
            );
          } else {
            setErrorMsg('No se pudo cargar el elemento de limpieza.');
          }
        } catch {
          setErrorMsg('Error al conectar con el servidor.');
        } finally {
          setLoadingFetch(false);
        }
      };

      fetchElemento();
    }
  }, [elementoId]);

  const toggleActivo = () => {
    setFormData((prev) => ({ ...prev, activo: !prev.activo }));
  };

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
    if (!formData.nombre?.trim()) {
      setAdvertenciaInput('El nombre del elemento no puede estar vacío.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elementoId) return;

    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const nom = formData.nombre?.trim();

    if (!nom) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }

    if (nom.length > 20) {
      setErrorMsg('El nombre no puede superar los 20 caracteres.');
      return;
    }

    if (formData.frecuenciaDeCambio !== null && formData.frecuenciaDeCambio !== undefined) {
      if (formData.frecuenciaDeCambio <= 0) {
        setErrorMsg('La frecuencia de cambio debe ser un número mayor a 0 días.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        nombre: nom,
        frecuenciaDeCambio: formData.frecuenciaDeCambio,
        activo: formData.activo,
      };

      const res = await fetch(`${API_URL}/elementosDeLimpieza/${elementoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let detalle = 'Error al actualizar el elemento de limpieza';
        if (typeof errData.detail === 'string') {
          detalle = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          detalle = errData.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Elemento de limpieza actualizado exitosamente');
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
        <h1>Editar Elemento de Limpieza</h1>
        <div className="subtitulo">ID: {elementoId}</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="id">ID (No editable)</label>
          <input id="id" type="text" value={elementoId || ''} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="nombre">
            Nombre <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre (máx. 20 caracteres)"
            value={formData.nombre || ''}
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
            placeholder="Opcional (ej: 15 o 30)"
            value={frecuenciaInput}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Estado</label>
          <button
            type="button"
            onClick={toggleActivo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#fff',
              backgroundColor: formData.activo ? '#16a34a' : '#dc2626',
              width: 'fit-content',
              transition: 'background-color 0.2s ease',
            }}
          >
            <span>{formData.activo ? '●' : '○'}</span>
            <span>{formData.activo ? 'Activo' : 'Inactivo'}</span>
          </button>
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !formData.nombre?.trim()}
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