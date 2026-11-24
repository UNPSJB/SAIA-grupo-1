import React, { useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { SIMBOLOS_ALERGENOS } from './tipos';
import { useAlertaOperacion } from '../../contexto/AlertaOperacionContext';

interface NuevoAlergenoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoAlergeno: React.FC<NuevoAlergenoProps> = ({ onSuccess, onCancel }) => {
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [nombre, setNombre] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const res = await apiFetch('/alergenos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreLimpio, simbolo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al registrar el alérgeno.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setNombre('');
      setSimbolo('');
      mostrarExito(
        'Alérgeno creado',
        'El alérgeno se registró correctamente.',
        3000,
        onSuccess,
      );
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al registrar el alérgeno.';
      setErrorMsg(mensaje);
      mostrarError('No se pudo crear el alérgeno', mensaje);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Alérgeno</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre del Alérgeno</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Leche, Derivados de trigo, Maní..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Símbolo del Alérgeno</label>
          <div
            className="simbolos-alergeno-grid"
          >
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
                  <span
                    className="simbolo-alergeno-texto"
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
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};