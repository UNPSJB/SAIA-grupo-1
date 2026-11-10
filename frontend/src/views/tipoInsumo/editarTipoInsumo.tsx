import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { TipoInsumo, TipoInsumoForm } from './tipos';

interface EditarTipoInsumoProps {
  id: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const UNIDADES_MEDIDA = [
  { valor: 'kilogramos', label: 'Kilogramos (kg)' },
  { valor: 'gramos', label: 'Gramos (g)' },
  { valor: 'litros', label: 'Litros (L)' },
  { valor: 'mililitros', label: 'Mililitros (mL)' },
  { valor: 'unidades', label: 'Unidades (u)' },
];

export const EditarTipoInsumo: React.FC<EditarTipoInsumoProps> = ({ id, onSuccess, onCancel }) => {
  const [form, setForm] = useState<TipoInsumoForm>({
    nombre: '',
    descripcion: '',
    unidadMedida: 'kilogramos',
  });
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/insumos/tipos/${id}`);
        if (!cancelado && res.ok) {
          const data: TipoInsumo = await res.json();
          setForm({
            nombre: data.nombre,
            descripcion: data.descripcion || '',
            unidadMedida: data.unidadMedida || 'kilogramos',
          });
          setActivo(data.activo);
        } else if (!cancelado) {
          setErrorMsg('No se pudo cargar la información del tipo de insumo.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar el tipo de insumo.');
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre del tipo de insumo no puede estar vacío.');
      return;
    }
    if (nombreLimpio.length < 2) {
      setErrorMsg('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombreLimpio,
        descripcion: form.descripcion.trim() || null,
        unidadMedida: form.unidadMedida,
        activo: activo,
      };

      const res = await apiFetch(`/insumos/tipos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al actualizar el tipo de insumo.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Tipo de insumo actualizado exitosamente.');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el tipo de insumo.');
    } finally {
      setLoading(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div className="modulo-container formulario-box">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del tipo de insumo...</p>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Tipo de Insumo</h1>
        <div className="subtitulo">03 · Edición</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre Genérico *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidadMedida">Unidad de Medida *</label>
          <select
            id="unidadMedida"
            name="unidadMedida"
            value={form.unidadMedida}
            onChange={handleChange}
            required
          >
            {UNIDADES_MEDIDA.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Tipo de Insumo Activo
          </label>
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
