import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { UnidadMedidaForm, UnidadMedidaItem } from './tipos';

interface EditarUnidadMedidaProps {
  id: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditarUnidadMedida: React.FC<EditarUnidadMedidaProps> = ({
  id,
  onSuccess,
  onCancel,
}) => {
  const [form, setForm] = useState<UnidadMedidaForm>({
    nombre: '',
    abreviatura: '',
  });
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/unidades-medida/${id}`);
        if (!cancelado && res.ok) {
          const data: UnidadMedidaItem = await res.json();
          setForm({
            nombre: data.nombre,
            abreviatura: data.abreviatura,
          });
        } else if (!cancelado) {
          setErrorMsg('No se pudo cargar la información de la unidad de medida.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar la unidad de medida.');
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = form.nombre.trim();
    const abrevLimpia = form.abreviatura.trim();

    if (!nombreLimpio) {
      setErrorMsg('El nombre de la unidad de medida es obligatorio.');
      return;
    }

    if (!abrevLimpia) {
      setErrorMsg('La abreviatura de la unidad de medida es obligatoria.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/unidades-medida/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreLimpio,
          abreviatura: abrevLimpia,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al actualizar la unidad de medida.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Unidad de medida actualizada exitosamente.');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar la unidad de medida.');
    } finally {
      setLoading(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div className="modulo-container formulario-box">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos de la unidad de medida...</p>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Unidad de Medida</h1>
        <div className="subtitulo">03 · Edición</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
            maxLength={50}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="abreviatura">Abreviatura *</label>
          <input
            id="abreviatura"
            name="abreviatura"
            type="text"
            value={form.abreviatura}
            onChange={handleChange}
            maxLength={20}
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
