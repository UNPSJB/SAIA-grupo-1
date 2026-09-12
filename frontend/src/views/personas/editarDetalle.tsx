import React, { useEffect, useState } from 'react';
import type { Persona, PersonaCreate, TipoCapacidad } from './tipos';
import '../../styles/formularioAlta.css';

interface EditarPersonaProps {
  personaLegajo?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CAPACIDADES: { valor: TipoCapacidad; etiqueta: string }[] = [
  { valor: 'operar', etiqueta: 'Operar' },
  { valor: 'administrar', etiqueta: 'Administrar' },
  { valor: 'ambas', etiqueta: 'Operar y Administrar' },
];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const EditarPersona: React.FC<EditarPersonaProps> = ({
  personaLegajo,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PersonaCreate>({
    documento: '',
    nombre: '',
    apellido: '',
    email: '',
    capacidad: 'operar',
    activo: true,
  });

  const [loadingFetch, setLoadingFetch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (personaLegajo) {
      const fetchPersona = async () => {
        try {
          const res = await fetch(`${API_URL}/personas/${personaLegajo}`);
          if (res.ok) {
            const data: Persona = await res.json();
            setFormData({
              documento: data.documento,
              nombre: data.nombre,
              apellido: data.apellido,
              email: data.email,
              capacidad: data.capacidad || 'operar',
              activo: data.activo,
            });
          } else {
            setErrorMsg('No se pudo cargar la persona.');
          }
        } catch {
          setErrorMsg('Error al conectar con el servidor.');
        } finally {
          setLoadingFetch(false);
        }
      };

      fetchPersona();
    }
  }, [personaLegajo]);

  const toggleActivo = () => {
  setFormData((prev) => ({ ...prev, activo: !prev.activo }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaLegajo) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/personas/${personaLegajo}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al actualizar la persona');
      }

      setSuccessMsg('Persona actualizada exitosamente');
      onSuccess?.();
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
        <h1>Editar Persona</h1>
        <div className="subtitulo">Legajo: {personaLegajo}</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="legajo">Legajo (No editable)</label>
          <input id="legajo" type="text" value={personaLegajo || ''} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="documento">Documento</label>
          <input
            id="documento"
            name="documento"
            type="text"
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
             <option key={cap.valor} value={cap.valor}>
                {cap.etiqueta}
        </option>
            ))}
          </select>
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
          <button type="submit" className="btn-guardar" disabled={loading}>
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