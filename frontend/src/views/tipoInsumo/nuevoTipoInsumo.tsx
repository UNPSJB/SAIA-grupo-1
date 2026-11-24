import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { TipoInsumoForm } from './tipos';
import type { UnidadMedidaItem } from '../unidadesMedida/tipos';
import { useAlertaOperacion } from '../../contexto/AlertaOperacionContext';

interface AlergenoItem {
  id: number;
  nombre: string;
  simbolo?: string;
}

interface NuevoTipoInsumoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoTipoInsumo: React.FC<NuevoTipoInsumoProps> = ({ onSuccess, onCancel }) => {
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [form, setForm] = useState<TipoInsumoForm & { alergeno_ids: number[] }>({
    nombre: '',
    descripcion: '',
    unidad_medida_id: '',
    cantidad_referencia: 1,
    equivalencia_gramos: '',
    es_aditivo: false,
    clase_funcional: '',
    numero_ins: '',
    alergeno_ids: [],
  });
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [alergenosDisponibles, setAlergenosDisponibles] = useState<AlergenoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarDatosAuxiliares() {
      try {
        const [resUnidades, resAlergenos] = await Promise.all([
          apiFetch('/unidades-medida/?solo_activos=true'),
          apiFetch('/alergenos/'),
        ]);
        if (!cancelado) {
          if (resUnidades.ok) {
            const dataU: UnidadMedidaItem[] = await resUnidades.json();
            setUnidades(dataU);
            if (dataU.length > 0) {
              const predet = dataU.find((u) => u.nombre.toLowerCase() === 'kilogramos') ?? dataU[0];
              setForm((prev) => (prev.unidad_medida_id === '' ? { ...prev, unidad_medida_id: predet.id } : prev));
            }
          }
          if (resAlergenos.ok) {
            const dataA: AlergenoItem[] = await resAlergenos.json();
            setAlergenosDisponibles(dataA);
          }
        }
      } catch {
        if (!cancelado) {
          setUnidades([]);
          setAlergenosDisponibles([]);
        }
      }
    }
    cargarDatosAuxiliares();
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

  const handleToggleAlergeno = (alergenoId: number) => {
    setForm((prev) => {
      const existe = prev.alergeno_ids.includes(alergenoId);
      return {
        ...prev,
        alergeno_ids: existe
          ? prev.alergeno_ids.filter((id) => id !== alergenoId)
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
        cantidad_referencia: form.cantidad_referencia ? Number(form.cantidad_referencia) : 1.0,
        equivalencia_gramos: form.equivalencia_gramos !== '' && form.equivalencia_gramos !== undefined ? Number(form.equivalencia_gramos) : null,
        es_aditivo: Boolean(form.es_aditivo),
        clase_funcional: form.es_aditivo ? (form.clase_funcional?.trim() || null) : null,
        numero_ins: form.es_aditivo ? (form.numero_ins?.trim() || null) : null,
        alergeno_ids: form.alergeno_ids,
      };

      const res = await apiFetch('/insumos/tipos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al registrar el tipo de insumo.';
        if (typeof data.detail === 'string') msg = data.detail;
        throw new Error(msg);
      }

      mostrarExito('Tipo de insumo creado', 'El tipo de insumo se registró correctamente.', 3000, onSuccess);
    } catch (err: unknown) {
      mostrarError('No se pudo crear el tipo de insumo', err instanceof Error ? err.message : 'Error al registrar el tipo de insumo.');
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
            placeholder="Ej: Harina, Leche, Sal..."
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

        {/* Sección de Selección de Alérgenos */}
        <div className="form-group">
          <label>Alérgenos Asociados (Declaración Obligatoria)</label>
          <div
            className="alergenos-seleccion-lista"
          >
            {alergenosDisponibles.map((alg) => {
              const seleccionado = form.alergeno_ids.includes(alg.id);
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => handleToggleAlergeno(alg.id)}
                  className={`alergeno-chip-btn ${seleccionado ? 'seleccionado' : ''}`}
                >
                  {alg.simbolo && (
                    <img src={alg.simbolo} alt={alg.nombre} className="alergeno-chip-icono" />
                  )}
                  <span className="alergeno-chip-texto">{alg.nombre}</span>
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