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
    activo: true,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdvertenciaInput(null);

    // Validación para documento
    if (name === 'documento') {
      if (/[^0-9]/.test(value)) {
        setAdvertenciaInput('En el documento solo se permiten números.');
        return;
      }
      if (value.length > 9) {
        setAdvertenciaInput('El documento no puede tener más de 9 dígitos.');
        return;
      }
      setFormData((prev) => ({ ...prev, documento: value }));
      return;
    }

    // validación para nombre y apellido
    if (name === 'nombre' || name === 'apellido') {
      if (/[0-9]/.test(value)) {
        setAdvertenciaInput(`No se permiten números en el campo ${name}.`);
        return;
      }
      if (/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(value)) {
        setAdvertenciaInput(`No se permiten símbolos o caracteres especiales en el campo ${name}.`);
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const doc = formData.documento.trim();
    const nom = formData.nombre.trim();
    const ape = formData.apellido.trim();
    const mail = formData.email.trim();

    if (!doc || !nom || !ape || !mail) {
      setErrorMsg('Por favor complete todos los campos obligatorios.');
      return;
    }

    // validamos q el mínimo sea de 7 dígitos en documento
    if (doc.length < 7) {
      setErrorMsg('El documento debe contener al menos 7 dígitos para ser válido.');
      return;
    }

    // validar formato de correo estándar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      setErrorMsg('Por favor ingrese un correo electrónico con formato válido (ejemplo: usuario@dominio.com).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        documento: doc,
        nombre: nom,
        apellido: ape,
        email: mail,
      };

      const response = await fetch(`${API_URL}/personas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detalle = 'Error al registrar la persona.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        } else if (Array.isArray(data.detail)) {
          detalle = data.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Persona dada de alta exitosamente.');
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
        <h1>Nueva Persona</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="documento">Documento</label>
          <input
            id="documento"
            name="documento"
            type="text"
            inputMode="numeric"
            placeholder="Ingrese documento (mínimo 7 dígitos)"
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
            placeholder="ejemplo@correo.com"
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