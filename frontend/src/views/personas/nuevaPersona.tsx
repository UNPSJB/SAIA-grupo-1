import React, { useState } from 'react';
import type { PersonaCreate, TipoCapacidad } from './tipos';
import '../../styles/formularioAlta.css';

interface NuevaPersonaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CAPACIDADES: TipoCapacidad[] = ['operar', 'administrar', 'ambas'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NuevaPersona: React.FC<NuevaPersonaProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<PersonaCreate>({
    documento: '',
    nombre: '',
    apellido: '',
    email: '',
    capacidad: 'operar',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (
      !formData.documento.trim() ||
      !formData.nombre.trim() ||
      !formData.apellido.trim() ||
      !formData.email.trim()
    ) {
      setErrorMsg('Por favor complete todos los datos obligatorios.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/personal/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error al guardar (${response.status})`);
      }

      setSuccessMsg('Persona dada de alta exitosamente.');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
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

        <div className="form-group">
          <label htmlFor="capacidad">Capacidad</label>
          <select
            id="capacidad"
            name="capacidad"
            value={formData.capacidad}
            onChange={handleChange}
            required
          >
            {CAPACIDADES.map((cap) => (
              <option key={cap} value={cap}>
                {cap === 'ambas'
                  ? 'Operar y Administrar'
                  : cap.charAt(0).toUpperCase() + cap.slice(1)}
              </option>
            ))}
          </select>
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