import React, { useState, useEffect } from 'react';
import type { Persona, PersonaCreate, TipoCapacidad } from './tipos';
import '../../styles/formularioAlta.css';

interface NuevaPersonaProps {
  persona?: Persona | null;
  modoSoloLectura?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NuevaPersona: React.FC<NuevaPersonaProps> = ({
  persona,
  modoSoloLectura = false,
  onSuccess,
  onCancel,
}) => {
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [operar, setOperar] = useState(false);
  const [administrar, setAdministrar] = useState(false);

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (persona) {
      setDocumento(persona.documento || '');
      setNombre(persona.nombre || '');
      setApellido(persona.apellido || '');
      setEmail(persona.email || '');
      setOperar(persona.capacidades?.includes('operar') || false);
      setAdministrar(persona.capacidades?.includes('administrar') || false);
    } else {
      setDocumento('');
      setNombre('');
      setApellido('');
      setEmail('');
      setOperar(true);
      setAdministrar(false);
    }
  }, [persona]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoSoloLectura) return;

    setError(null);
    setMensaje(null);

    const capacidades: TipoCapacidad[] = [];
    if (operar) capacidades.push('operar');
    if (administrar) capacidades.push('administrar');

    if (capacidades.length === 0) {
      setError('Debes seleccionar al menos una capacidad.');
      return;
    }

    const payload: PersonaCreate = {
      documento,
      nombre,
      apellido,
      email,
      capacidades,
    };

    setGuardando(true);

    try {
      const url = persona
        ? `${API_URL}/personas/${persona.legajo}`
        : `${API_URL}/personas/`;
      const method = persona ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al guardar los datos.');
      }

      setMensaje(persona ? 'Persona actualizada con éxito.' : 'Persona creada con éxito.');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = modoSoloLectura
    ? 'Detalle de Persona'
    : persona
    ? 'Editar Persona'
    : 'Nueva Persona';

  return (
    <div className="modulo-container">
      <div className="modulo-header">
        <h1>{titulo}</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {error && <div className="alerta-error">{error}</div>}
      {mensaje && <div className="alerta-exito">{mensaje}</div>}

      <form onSubmit={handleSubmit} className="formulario-box">
        <div className="form-group">
          <label>Documento</label>
          <input
            type="text"
            placeholder="Introduce el documento"
            value={documento}
            disabled={modoSoloLectura}
            onChange={(e) => setDocumento(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            placeholder="Introduce el nombre"
            value={nombre}
            disabled={modoSoloLectura}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Apellido</label>
          <input
            type="text"
            placeholder="Introduce el apellido"
            value={apellido}
            disabled={modoSoloLectura}
            onChange={(e) => setApellido(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Introduce el email"
            value={email}
            disabled={modoSoloLectura}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Capacidades</label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: modoSoloLectura ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={operar}
                disabled={modoSoloLectura}
                onChange={(e) => setOperar(e.target.checked)}
              />
              Operar
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: modoSoloLectura ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={administrar}
                disabled={modoSoloLectura}
                onChange={(e) => setAdministrar(e.target.checked)}
              />
              Administrar
            </label>
          </div>
        </div>

        <div className="form-acciones">
          {!modoSoloLectura && (
            <button type="submit" className="btn-guardar" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          )}
          <button type="button" onClick={onCancel} className="btn-cancelar">
            {modoSoloLectura ? 'Volver' : 'Cancelar'}
          </button>
        </div>
      </form>
    </div>
  );
};