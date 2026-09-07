import React, { useState } from 'react';
import type { Persona, TipoCapacidad } from './tipos';
import '../../styles/formularioAlta.css';

interface NuevaPersonaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NuevaPersona: React.FC<NuevaPersonaProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Persona, 'id'>>({
    legajo: '',
    documento: '',
    nombre: '',
    apellido: '',
    email: '',
    capacidades: ['operar'], // Por defecto al menos una seleccionada
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador para permitir una o ambas capacidades
  const handleCapacidadChange = (capacidad: TipoCapacidad) => {
    setFormData((prev) => {
      const yaExiste = prev.capacidades.includes(capacidad);
      const nuevasCapacidades = yaExiste
        ? prev.capacidades.filter((c) => c !== capacidad)
        : [...prev.capacidades, capacidad];

      return {
        ...prev,
        capacidades: nuevasCapacidades,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (
      !formData.legajo.trim() ||
      !formData.documento.trim() ||
      !formData.nombre.trim() ||
      !formData.apellido.trim() ||
      !formData.email.trim()
    ) {
      setErrorMsg('Por favor complete todos los datos.');
      return;
    }

    if (formData.capacidades.length === 0) {
      setErrorMsg('Debe asignar al menos una capacidad (operar, administrar o ambas).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/personas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al guardar la persona.');
      }

      setSuccessMsg('Persona dada de alta exitosamente.');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error de conexión con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nueva Persona</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="legajo">Legajo</label>
          <input
            id="legajo"
            name="legajo"
            type="text"
            placeholder="Introduce el legajo"
            value={formData.legajo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="documento">Documento</label>
          <input
            id="documento"
            name="documento"
            type="text"
            placeholder="Introduce el documento (DNI)"
            value={formData.documento}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="apellido">Apellido</label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            placeholder="Introduce el apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Introduce el correo electrónico"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Sección de capacidades con soporte para una o ambas */}
        <div className="form-group">
          <label>Capacidades asignadas</label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 'normal' }}>
              <input
                type="checkbox"
                checked={formData.capacidades.includes('operar')}
                onChange={() => handleCapacidadChange('operar')}
                style={{ width: 'auto' }}
              />
              Operar
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 'normal' }}>
              <input
                type="checkbox"
                checked={formData.capacidades.includes('administrar')}
                onChange={() => handleCapacidadChange('administrar')}
                style={{ width: 'auto' }}
              />
              Administrar
            </label>
          </div>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
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