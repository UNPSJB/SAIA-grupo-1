import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { TipoInsumo, TipoInsumoForm } from './tipos';
import type { UnidadMedidaItem } from '../unidadesMedida/tipos';
import { useAlertaOperacion } from '../../contexto/AlertaOperacionContext';

interface AlergenoItem {
  id: number;
  nombre: string;
  simbolo?: string;
}

interface EditarTipoInsumoProps {
  id: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditarTipoInsumo: React.FC<EditarTipoInsumoProps> = ({ id, onSuccess, onCancel }) => {
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [form, setForm] = useState<TipoInsumoForm & { alergeno_ids: number[] }>({
    nombre: '',
    descripcion: '',
    unidad_medida_id: '',
    alergeno_ids: [],
  });
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [alergenosDisponibles, setAlergenosDisponibles] = useState<AlergenoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const [resTipo, resUnidades, resAlergenos] = await Promise.all([
          apiFetch(`/insumos/tipos/${id}`),
          apiFetch('/unidades-medida/?solo_activos=false'),
          apiFetch('/alergenos/'),
        ]);
        const listaUnidades: UnidadMedidaItem[] = resUnidades.ok ? await resUnidades.json() : [];
        const listaAlergenos: AlergenoItem[] = resAlergenos.ok ? await resAlergenos.json() : [];
        
        if (!cancelado) {
          setUnidades(listaUnidades);
          setAlergenosDisponibles(listaAlergenos);
        }

        if (!cancelado && resTipo.ok) {
          const data: TipoInsumo & { alergenos?: { id: number }[] } = await resTipo.json();
          const unidadCoincidente =
            data.unidad_medida_id ??
            listaUnidades.find(
              (u) => u.nombre.toLowerCase() === (data.unidadMedida || '').toLowerCase()
            )?.id ??
            '';

          const idsAsociados = data.alergenos ? data.alergenos.map((a) => a.id) : [];

          setForm({
            nombre: data.nombre,
            descripcion: data.descripcion || '',
            unidad_medida_id: unidadCoincidente,
            equivalencia_gramos: data.equivalencia_gramos ?? '',
            alergeno_ids: idsAsociados,
          });
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
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'unidad_medida_id' ? (value ? Number(value) : '') : value,
    });
  };

  const handleToggleAlergeno = (alergenoId: number) => {
    setForm((prev) => {
      const existe = prev.alergeno_ids.includes(alergenoId);
      return {
        ...prev,
        alergeno_ids: existe
          ? prev.alergeno_ids.filter((aid) => aid !== alergenoId)
          : [...prev.alergeno_ids, alergenoId],
      };
    });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) {
      mostrarError('Nombre requerido', 'El nombre del tipo de insumo no puede estar vacío.');
      return;
    }
    if (!form.unidad_medida_id) {
      mostrarError('Unidad requerida', 'Debe seleccionar una unidad de medida.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombreLimpio,
        descripcion: form.descripcion.trim() || null,
        unidad_medida_id: Number(form.unidad_medida_id),
        equivalencia_gramos: form.equivalencia_gramos !== '' && form.equivalencia_gramos !== undefined ? Number(form.equivalencia_gramos) : null,
        alergeno_ids: form.alergeno_ids,
      };

      const res = await apiFetch(`/insumos/tipos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al actualizar el tipo de insumo.';
        if (typeof data.detail === 'string') msg = data.detail;
        throw new Error(msg);
      }

      mostrarExito('Tipo de insumo actualizado', 'Los cambios del tipo de insumo se guardaron correctamente.', 3000, onSuccess);
    } catch (err: unknown) {
      mostrarError('No se pudo actualizar el tipo de insumo', err instanceof Error ? err.message : 'Error al actualizar el tipo de insumo.');
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
          <label htmlFor="unidad_medida_id">Unidad de Medida *</label>
          <select
            id="unidad_medida_id"
            name="unidad_medida_id"
            value={form.unidad_medida_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione una unidad...</option>
            {unidades
              .filter((u) => u.activo || u.id === Number(form.unidad_medida_id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.abreviatura})
                </option>
              ))}
          </select>
        </div>

        {/* Selección de Alérgenos en Edición */}
        <div className="form-group">
          <label>Alérgenos Asociados</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
              gap: '8px',
              marginTop: '6px',
            }}
          >
            {alergenosDisponibles.map((alg) => {
              const seleccionado = form.alergeno_ids.includes(alg.id);
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => handleToggleAlergeno(alg.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: seleccionado ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: seleccionado ? '#eff6ff' : '#ffffff',
                    color: seleccionado ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: seleccionado ? 700 : 500,
                  }}
                >
                  {alg.simbolo && (
                    <img src={alg.simbolo} alt={alg.nombre} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                  )}
                  <span>{alg.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="equivalencia_gramos">Equivalencia en Gramos (por 1 unidad de medida)</label>
          <input
            id="equivalencia_gramos"
            name="equivalencia_gramos"
            type="number"
            min="0.01"
            step="any"
            value={form.equivalencia_gramos ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                equivalencia_gramos: e.target.value ? Number(e.target.value) : '',
              })
            }
          />
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