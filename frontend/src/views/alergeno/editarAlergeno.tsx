import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { SIMBOLOS_ALERGENOS } from './tipos';
import { useAlertaOperacion } from '../../contexto/AlertaOperacionContext';

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
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [nombre, setNombre] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          if (!cancelado) {
            setErrorMsg('No se pudo cargar el alérgeno.');
            mostrarError('No se pudo cargar el alérgeno', 'No se pudo cargar el alérgeno.');
          }
        }
      } catch {
        if (!cancelado) {
          setErrorMsg('Error de conexión al cargar el alérgeno.');
          mostrarError('Error de conexión', 'No se pudo conectar con el servidor.');
        }
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [alergenoId, mostrarError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alergenoId) return;
    setErrorMsg(null);
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      mostrarError('Nombre requerido', 'El nombre del alérgeno no puede estar vacío.');
      return;
    }
    if (nombreLimpio.length < 2) {
      mostrarError('Nombre inválido', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!simbolo) {
      mostrarError('Símbolo requerido', 'Debe seleccionar un símbolo para el alérgeno.');
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

      mostrarExito(
        'Alérgeno actualizado',
        'Los cambios del alérgeno se guardaron correctamente.',
        3000,
        onSuccess,
      );
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al editar el alérgeno.';
      setErrorMsg(mensaje);
      mostrarError('No se pudo actualizar el alérgeno', mensaje);
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
          <div className="simbolos-alergeno-grid">
            {SIMBOLOS_ALERGENOS.map((opcion) => {
              const seleccionado = simbolo === opcion.ruta;
              return (
                <button
                  key={opcion.ruta}
                  type="button"
                  onClick={() => setSimbolo(opcion.ruta)}
                  className={`simbolo-alergeno-btn ${seleccionado ? 'seleccionado' : ''}`}
                >
                  <img
                    src={opcion.ruta}
                    alt={opcion.etiqueta}
                    className="simbolo-alergeno-img"
                  />
                  <span className="simbolo-alergeno-texto">
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