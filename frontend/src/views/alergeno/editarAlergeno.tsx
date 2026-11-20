import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { SIMBOLOS_ALERGENOS } from './tipos';

interface EditarAlergenoProps {
  alergenoId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditarAlergeno: React.FC<EditarAlergenoProps> = ({
  alergenoId,
  onSuccess,
  onCancel,
}) => {
  const [nombre, setNombre] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!alergenoId) return;
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/alergenos/${alergenoId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) {
            setNombre(data.nombre || '');
            setSimbolo(data.simbolo || '');
          }
        } else {
          if (!cancelado) setErrorMsg('No se pudo cargar el alérgeno.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar el alérgeno.');
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [alergenoId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alergenoId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre del alérgeno no puede estar vacío.');
      return;
    }
    if (nombreLimpio.length < 2) {
      setErrorMsg('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!simbolo) {
      setErrorMsg('Debe seleccionar un símbolo para el alérgeno.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/alergenos/${alergenoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreLimpio, simbolo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al editar el alérgeno.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Alérgeno editado exitosamente.');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al editar el alérgeno.');
    } finally {
      setLoading(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Editar Alérgeno</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del alérgeno...</div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Alérgeno</h1>
        <div className="subtitulo">03 · Modificación</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre del Alérgeno</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Símbolo del Alérgeno</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
              gap: '10px',
              marginTop: '8px',
            }}
          >
            {SIMBOLOS_ALERGENOS.map((opcion) => {
              const seleccionado = simbolo === opcion.ruta;
              return (
                <button
                  key={opcion.ruta}
                  type="button"
                  onClick={() => setSimbolo(opcion.ruta)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 6px',
                    borderRadius: '8px',
                    border: seleccionado ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: seleccionado ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={opcion.ruta}
                    alt={opcion.etiqueta}
                    style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '6px' }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: seleccionado ? 700 : 500,
                      color: seleccionado ? '#1d4ed8' : '#334155',
                      textAlign: 'center',
                    }}
                  >
                    {opcion.etiqueta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};