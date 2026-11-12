import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { TipoInsumoForm } from './tipos';
import type { UnidadMedidaItem } from '../unidadesMedida/tipos';

interface NuevoTipoInsumoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoTipoInsumo: React.FC<NuevoTipoInsumoProps> = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState<TipoInsumoForm>({
    nombre: '',
    descripcion: '',
    unidad_medida_id: '',
  });
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarUnidades() {
      try {
        const res = await apiFetch('/unidades-medida/?solo_activos=true');
        if (!cancelado && res.ok) {
          const data: UnidadMedidaItem[] = await res.json();
          setUnidades(data);
          if (data.length > 0) {
            const predet =
              data.find((u) => u.nombre.toLowerCase() === 'kilogramos') ?? data[0];
            setForm((prev) =>
              prev.unidad_medida_id === '' ? { ...prev, unidad_medida_id: predet.id } : prev
            );
          }
        }
      } catch {
        if (!cancelado) setUnidades([]);
      }
    }
    cargarUnidades();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'unidad_medida_id' ? (value ? Number(value) : '') : value,
    });
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

    if (!form.unidad_medida_id) {
      setErrorMsg('Debe seleccionar una unidad de medida.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombreLimpio,
        descripcion: form.descripcion.trim() || null,
        unidad_medida_id: Number(form.unidad_medida_id),
      };

      const res = await apiFetch('/insumos/tipos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al registrar el tipo de insumo.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Tipo de insumo registrado exitosamente.');
      setForm((prev) => ({ nombre: '', descripcion: '', unidad_medida_id: prev.unidad_medida_id }));
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el tipo de insumo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Tipo de Insumo</h1>
        <div className="subtitulo">02 · Formulario</div>
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
            placeholder="Ej: Harina, Esencia de Vainilla, Sal..."
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida_id">Unidad de Medida *</label>
          <select
            id="unidad_medida_id"
            name="unidad_medida_id"
            value={form.unidad_medida_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione una unidad...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.abreviatura})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            placeholder="Descripción genérica del insumo..."
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
          />
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
