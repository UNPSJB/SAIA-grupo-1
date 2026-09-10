import React, { useEffect, useState } from 'react';
import type { Persona } from './tipos';
import '../../styles/formularioAlta.css';

interface DetallePersonaProps {
  onCancel?: () => void;
  personaLegajo?: number | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const DetallePersona: React.FC<DetallePersonaProps> = ({ onCancel, personaLegajo }) => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (personaLegajo) {
      const fetchPersona = async () => {
        try {
          const res = await fetch(`${API_URL}/personas/${personaLegajo}`);
          if (res.ok) {
            const data = await res.json();
            setPersona(data);
          }
        } catch {
          alert('La persona no existe.');
        } finally {
          setLoading(false);
        }
      };

      fetchPersona();
    }
  }, [personaLegajo]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle Persona</h1>
        <div className="subtitulo">Legajo: {personaLegajo}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando persona...</div>
      ) : persona ? (
        <form>
          <div className="form-group">
            <label htmlFor="legajo">Legajo (No editable)</label>
            <input
              id="legajo"
              name="legajo"
              type="text"
              value={persona.legajo}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="documento">Documento</label>
            <input
              id="documento"
              name="documento"
              type="text"
              value={persona.documento}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={persona.nombre}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido</label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              value={persona.apellido}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="text"
              value={persona.email}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="capacidad">Capacidad</label>
            <input
              id="capacidad"
              name="capacidad"
              type="text"
              value={
                persona.capacidad
                  ? persona.capacidad.charAt(0).toUpperCase() + persona.capacidad.slice(1)
                  : 'Ninguna'
              }
              disabled
            />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>La persona no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};