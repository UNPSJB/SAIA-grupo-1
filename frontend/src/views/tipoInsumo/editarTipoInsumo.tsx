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
    es_aditivo: false,
    clase_funcional: '',
    numero_ins: '',
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
            es_aditivo: Boolean(data.es_aditivo),
            clase_funcional: data.clase_funcional || '',
            numero_ins: data.numero_ins || '',
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
        equivalencia_gramos: form.equivalencia_gramos !== '' && form.equivalencia_gramos !== undefined ? Number(form.equivalencia_gramos) : null,
        es_aditivo: esAditivo,
        clase_funcional: esAditivo ? claseFuncionalLimpia : null,
        numero_ins: esAditivo ? (numeroInsLimpio || null) : null,
        es_aromatizante: esAditivo && esAromatizante,
        es_edulcorante: esAditivo && esEdulcorante,
        es_cafeina: esAditivo && esCafeina,
        alergeno_ids: form.alergeno_ids,
      };

      const res = await apiFetch(`/insumos/tipos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = esAditivo ? 'Error al actualizar el aditivo.' : 'Error al actualizar el tipo de insumo.';
        if (typeof data.detail === 'string') msg = data.detail;
        throw new Error(msg);
      }

      mostrarExito(
        esAditivo ? 'Aditivo actualizado' : 'Tipo de insumo actualizado',
        'Los cambios se guardaron correctamente.',
        3000,
        onSuccess
      );
    } catch (err: unknown) {
      mostrarError(
        esAditivo ? 'No se pudo actualizar el aditivo' : 'No se pudo actualizar el tipo de insumo',
        err instanceof Error ? err.message : 'Error al actualizar.'
      );
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

  const esAditivoActivo = Boolean(form.es_aditivo);
  const esAromatizanteActivo = (form.clase_funcional || '').toLowerCase().includes('aromatizante');

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>{esAditivoActivo ? 'Editar Tipo de Aditivo' : 'Editar Tipo de Insumo'}</h1>
        <div className="subtitulo">03 · Edición</div>
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
                {form.clase_funcional &&
                  !CLASES_FUNCIONALES.includes(form.clase_funcional) && (
                    <option value={form.clase_funcional}>{form.clase_funcional}</option>
                  )}
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
            {unidades
              .filter((u) => u.activo || u.id === Number(form.unidad_medida_id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.abreviatura})
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Alérgenos Asociados</label>
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

        {(() => {
          const unidadSel = unidades.find((u) => u.id === Number(form.unidad_medida_id));
          const nomU = (unidadSel?.nombre || '').toLowerCase();
          const esMasa = ['gramos', 'kilogramos', 'toneladas', 'gramo', 'kilogramo', 'tonelada'].includes(nomU);
          const etiquetaU = unidadSel ? unidadSel.abreviatura || unidadSel.nombre : 'unidad';
          return (
            <div className="form-group">
              <label htmlFor="equivalencia_gramos">
                {unidadSel && !esMasa
                  ? `1 ${etiquetaU} equivale a (gramos) *`
                  : 'Equivalencia en gramos (opcional para unidades de masa)'}
              </label>
              <input
                id="equivalencia_gramos"
                name="equivalencia_gramos"
                type="number"
                min="0.01"
                step="any"
                required={Boolean(unidadSel && !esMasa)}
                placeholder={
                  unidadSel && !esMasa
                    ? `Ej: ¿cuántos gramos pesa 1 ${etiquetaU}?`
                    : 'Ej: 1000 para 1 KG'
                }
                value={form.equivalencia_gramos ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    equivalencia_gramos: e.target.value ? Number(e.target.value) : '',
                  })
                }
              />
            </div>
          );
        })()}

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