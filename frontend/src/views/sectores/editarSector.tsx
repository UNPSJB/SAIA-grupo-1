import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface EditarSectorProps {
  sectorId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditarSector: React.FC<EditarSectorProps> = ({ sectorId, onSuccess, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sectorId) return;
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/sectores/${sectorId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) setNombre(data.nombre);
        } else {
          if (!cancelado) setErrorMsg('No se pudo cargar el sector.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar el sector.');
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [sectorId]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sectorId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre del sector no puede estar vacío.');
      return;
    }
    if (nombreLimpio.length < 2) {
      setErrorMsg('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/sectores/${sectorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreLimpio }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al editar el sector.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Sector editado exitosamente.');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al editar el sector.');
    } finally {
      setLoading(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Editar Sector</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del sector...</div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Sector</h1>
        <div className="subtitulo">03 · Modificación</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre del Sector</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
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

