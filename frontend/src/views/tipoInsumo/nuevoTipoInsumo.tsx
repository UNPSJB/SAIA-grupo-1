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

const CLASES_FUNCIONALES = [
  'Conservante',
  'Antioxidante',
  'Colorante',
  'Edulcorante',
  'Aromatizante',
  'Leudante químico',
  'Emulsionante',
  'Acidulante',
  'Estabilizante',
  'Espesante',
  'Humectante',
  'Regulador de acidez',
  'Potenciador de sabor',
  'Estimulante',
];

interface NuevoTipoInsumoProps {
  esAditivoInicial?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoTipoInsumo: React.FC<NuevoTipoInsumoProps> = ({
  esAditivoInicial = false,
  onSuccess,
  onCancel,
}) => {
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [form, setForm] = useState<TipoInsumoForm & { alergeno_ids: number[] }>({
    nombre: '',
    descripcion: '',
    unidad_medida_id: '',
    cantidad_referencia: 1,
    equivalencia_gramos: '',
    es_aditivo: esAditivoInicial,
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

    const esAditivo = Boolean(form.es_aditivo);
    const claseFuncionalLimpia = (form.clase_funcional || '').trim();
    const numeroInsLimpio = (form.numero_ins || '').trim();
    const esAromatizante = claseFuncionalLimpia.toLowerCase().includes('aromatizante');

    if (esAditivo) {
      if (!claseFuncionalLimpia) {
        mostrarError('Clase funcional requerida', 'Debe seleccionar la clase funcional del aditivo.');
        return;
      }
      if (!esAromatizante && !numeroInsLimpio) {
        mostrarError('Número INS requerido', 'Debe ingresar el número INS del aditivo (ej: INS 202).');
        return;
      }
    }

    setLoading(true);
    try {
      const esEdulcorante = claseFuncionalLimpia.toLowerCase().includes('edulcorante');
      const esCafeina =
        nombreLimpio.toLowerCase().includes('cafeína') ||
        nombreLimpio.toLowerCase().includes('cafeina');

      const payload = {
        nombre: nombreLimpio,
        descripcion: form.descripcion.trim() || null,
        unidad_medida_id: Number(form.unidad_medida_id),
        cantidad_referencia: form.cantidad_referencia ? Number(form.cantidad_referencia) : 1.0,
        equivalencia_gramos: form.equivalencia_gramos !== '' && form.equivalencia_gramos !== undefined ? Number(form.equivalencia_gramos) : null,
        es_aditivo: esAditivo,
        clase_funcional: esAditivo ? claseFuncionalLimpia : null,
        numero_ins: esAditivo ? (numeroInsLimpio || null) : null,
        es_aromatizante: esAditivo && esAromatizante,
        es_edulcorante: esAditivo && esEdulcorante,
        es_cafeina: esAditivo && esCafeina,
        alergeno_ids: form.alergeno_ids,
      };

      const res = await apiFetch('/insumos/tipos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = esAditivo ? 'Error al registrar el aditivo.' : 'Error al registrar el tipo de insumo.';
        if (typeof data.detail === 'string') msg = data.detail;
        throw new Error(msg);
      }

      mostrarExito(
        esAditivo ? 'Aditivo creado' : 'Tipo de insumo creado',
        esAditivo ? 'El aditivo se registró correctamente.' : 'El tipo de insumo se registró correctamente.',
        3000,
        onSuccess
      );
    } catch (err: unknown) {
      mostrarError(
        esAditivo ? 'No se pudo crear el aditivo' : 'No se pudo crear el tipo de insumo',
        err instanceof Error ? err.message : 'Error al registrar.'
      );
    } finally {
      setLoading(false);
    }
  }

  const esAditivoActivo = Boolean(form.es_aditivo);
  const esAromatizanteActivo = (form.clase_funcional || '').toLowerCase().includes('aromatizante');

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>{esAditivoActivo ? 'Nuevo Tipo de Aditivo' : 'Nuevo Tipo de Insumo'}</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Clasificación *</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={!esAditivoActivo ? 'btn-guardar' : 'btn-cancelar'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  es_aditivo: false,
                  clase_funcional: '',
                  numero_ins: '',
                }))
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>nutrition</span>
              Ingrediente
            </button>
            <button
              type="button"
              className={esAditivoActivo ? 'btn-guardar' : 'btn-cancelar'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  es_aditivo: true,
                }))
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>science</span>
              Aditivo
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="nombre">{esAditivoActivo ? 'Nombre Completo del Aditivo *' : 'Nombre Genérico *'}</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder={esAditivoActivo ? 'Ej: Sorbato de potasio, Propionato de calcio...' : 'Ej: Harina, Leche, Sal...'}
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        {esAditivoActivo && (
          <>
            <div className="form-group">
              <label htmlFor="clase_funcional">Clase Funcional *</label>
              <select
                id="clase_funcional"
                name="clase_funcional"
                value={form.clase_funcional || ''}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Seleccione una clase funcional...</option>
                {CLASES_FUNCIONALES.map((cf) => (
                  <option key={cf} value={cf}>
                    {cf}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numero_ins">
                Número INS {esAromatizanteActivo ? '(Opcional para aromatizantes)' : '*'}
              </label>
              <input
                id="numero_ins"
                name="numero_ins"
                type="text"
                placeholder="Ej: INS 202, INS 282..."
                value={form.numero_ins || ''}
                onChange={handleChange}
                required={!esAromatizanteActivo}
              />
            </div>
          </>
        )}

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