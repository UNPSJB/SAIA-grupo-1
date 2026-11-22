import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { mensajeDeError } from '../incidentes/tipos';
import { formatearFecha, obtenerFechaLocalHoy } from './tipos';
import type { LoteForm, LoteProduccion } from './tipos';
import { useProductos } from './useProductos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';
import type { RecetaConId, ChecklistReceta, RecetaDetalleConId } from '../receta/tipos';

interface NuevoLoteProps {
  /** Acceso directo para asociar insumos al lote recién guardado */
  onAsociarInsumos: (lote: LoteProduccion) => void;
  onVolver: () => void;
  onChecklistGenerado?: (checklistId: number) => void;
}

const formularioInicial = (): LoteForm => ({
  producto: '',
  fecha: obtenerFechaLocalHoy(),
  cantidad: '',
});

const redondearCantidad = (valor: number): number => {
  return Math.round((valor + Number.EPSILON) * 1000) / 1000;
};

export const NuevoLote: React.FC<NuevoLoteProps> = ({
  onAsociarInsumos,
  onVolver,
  onChecklistGenerado,
}) => {
  const { usuario, esAdministrador } = useAuth();
  const { productos, cargando, error: errorProductos } = useProductos();
  const [form, setForm] = useState<LoteForm>(formularioInicial);
  const [factorInput, setFactorInput] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loteCreado, setLoteCreado] = useState<LoteProduccion | null>(null);
  const [checklistCreado, setChecklistCreado] = useState<ChecklistReceta | null>(null);
  const [recetas, setRecetas] = useState<RecetaConId[]>([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const fetchRecetas = async () => {
      try {
        const res = await apiFetch(`/recetas/`);
        if (!cancelado && res.ok) {
          const data: RecetaConId[] = await res.json();
          setRecetas(data);
        }
      } catch {
        if (!cancelado) setRecetas([]);
      } finally {
        if (!cancelado) setCargandoRecetas(false);
      }
    };
    fetchRecetas();
    return () => {
      cancelado = true;
    };
  }, []);

  const recetasDelOperador = recetas.filter(
    (r) =>
      r.activo &&
      Boolean(r.version_vigente) &&
      (esAdministrador || Number(r.operario_legajo) === Number(usuario?.legajo))
  );

  const idsProductosDelOperador = new Set(
    recetasDelOperador.map((r) => Number(r.id_producto))
  );

  const productosAsignados = productos.filter(
    (p) => p.activo && idsProductosDelOperador.has(Number(p.id))
  );

  const cargandoDatos = cargando || cargandoRecetas;
  const sinProductosAsignados =
    !cargandoDatos && !errorProductos && productosAsignados.length === 0;

  const productoSeleccionado = productosAsignados.find(
    (p) => String(p.id) === form.producto
  );
  const unidad = productoSeleccionado?.unidadMedida ?? '';

  // Buscamos la receta vigente correspondiente al producto elegido
  const recetaAsociada = recetasDelOperador.find(
    (r) => String(r.id_producto) === form.producto
  );
  const versionVigente = recetaAsociada?.version_vigente ?? recetaAsociada?.version_actual;
  const rendimientoBase = Number(
    versionVigente?.rendimiento_final ?? recetaAsociada?.rendimiento_final ?? 0
  );
  const etapasBase: RecetaDetalleConId[] =
    versionVigente?.detalles ?? recetaAsociada?.detalles ?? [];

  // Cuando el operador selecciona un producto, precargamos su rendimiento base (factor = 1)
  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoProdId = e.target.value;
    const rec = recetasDelOperador.find((r) => String(r.id_producto) === nuevoProdId);
    const rend = Number(
      rec?.version_vigente?.rendimiento_final ?? rec?.rendimiento_final ?? 0
    );

    setForm((prev) => ({
      ...prev,
      producto: nuevoProdId,
      cantidad: rend > 0 ? rend : '',
    }));
    setFactorInput('1');
    setErrorMsg(null);
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, fecha: e.target.value }));
  };

  // Si cambia la Cantidad Objetivo, recalculamos el Factor automáticamente
  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (valor === '') {
      setForm((prev) => ({ ...prev, cantidad: '' }));
      setFactorInput('');
      return;
    }
    const cantNum = Number(valor);
    setForm((prev) => ({ ...prev, cantidad: cantNum }));
    if (rendimientoBase > 0 && cantNum > 0) {
      setFactorInput(String(redondearCantidad(cantNum / rendimientoBase)));
    }
  };

  // Si cambia el Factor Multiplicador (ej. 2 para duplicar, 1.5 para 36 medialunas), recalculamos la Cantidad Objetivo
  const handleFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFactorInput(valor);
    if (valor === '') {
      setForm((prev) => ({ ...prev, cantidad: '' }));
      return;
    }
    const factorNum = Number(valor);
    if (rendimientoBase > 0 && factorNum > 0) {
      setForm((prev) => ({
        ...prev,
        cantidad: redondearCantidad(rendimientoBase * factorNum),
      }));
    }
  };

  const factorActual =
    rendimientoBase > 0 && form.cantidad !== '' && Number(form.cantidad) > 0
      ? Number(form.cantidad) / rendimientoBase
      : 0;

  const validar = (): string | null => {
    if (!form.producto) return 'Debe seleccionar un producto.';
    if (!form.fecha) return 'Debe indicar la fecha del lote.';
    if (form.fecha > obtenerFechaLocalHoy())
      return 'La fecha del lote no puede ser posterior a la fecha actual.';
    if (form.cantidad === '' || factorInput.trim() === '')
      return 'La cantidad objetivo y el factor no pueden estar vacíos.';
    if (Number(form.cantidad) <= 0 || Number(factorInput) <= 0)
      return 'La cantidad objetivo y el factor multiplicador deben ser mayores a cero.';
    if (!Number.isInteger(Number(form.cantidad)))
      return 'La cantidad del lote debe ser un número entero discreto de unidades de producto.';
    return null;
  };

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const problema = validar();
    if (problema) {
      setErrorMsg(problema);
      return;
    }

    const cantidadProducir = Number(form.cantidad);

    const payloadLote = {
      producto_id: Number(form.producto),
      fecha: form.fecha,
      cantidad: cantidadProducir,
    };

    setLoading(true);
    try {
      // 1. Si existe receta asociada, validamos el escalado en el backend (sin modificar la receta base)
      if (recetaAsociada) {
        const resEscalar = await apiFetch(`/recetas/${recetaAsociada.id}/escalar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantidad_objetivo: cantidadProducir }),
        });
        if (!resEscalar.ok) {
          const errEsc = await resEscalar.json().catch(() => ({}));
          throw new Error(
            mensajeDeError(errEsc.detail, 'Error al calcular el escalado de la receta.')
          );
        }
      }

      // 2. Creamos el lote de producción
      const resLote = await apiFetch('/lotes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadLote),
      });

      if (!resLote.ok) {
        const errorData = await resLote.json().catch(() => ({}));
        throw new Error(mensajeDeError(errorData.detail, 'Error al registrar el lote.'));
      }

      const nuevoLote: LoteProduccion = await resLote.json();

      // 3. Generamos el checklist precargado con las cantidades escaladas para esta producción
      const resChecklist = await apiFetch('/recetas/checklist/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          id_producto: Number(form.producto),
          cantidad_objetivo: cantidadProducir,
        }),
      });

      if (resChecklist.ok) {
        const nuevoChecklist: ChecklistReceta = await resChecklist.json();
        setChecklistCreado(nuevoChecklist);
        if (onChecklistGenerado) {
          onChecklistGenerado(nuevoChecklist.id);
          return;
        }
      } else {
        const errChecklist = await resChecklist.json().catch(() => ({}));
        console.warn('Aviso al generar checklist:', errChecklist.detail);
      }

      setLoteCreado(nuevoLote);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error de conexión con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  const registrarOtro = () => {
    setLoteCreado(null);
    setChecklistCreado(null);
    setErrorMsg(null);
    setForm(formularioInicial());
    setFactorInput('1');
  };

  if (loteCreado) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Lote y Checklist generados</h1>
          <div className="subtitulo">Producción</div>
        </div>

        <div className="lote-resultado">
          <span className="lote-resultado-etiqueta">Código del lote</span>
          <span className="lote-resultado-codigo">{loteCreado.codigo}</span>
          <dl className="lote-resultado-detalle">
            <dt>Producto</dt>
            <dd>{loteCreado.producto.nombre}</dd>
            <dt>Fecha</dt>
            <dd>{formatearFecha(loteCreado.fecha)}</dd>
            <dt>Cantidad producida</dt>
            <dd>
              {loteCreado.cantidad} {loteCreado.producto.unidadMedida}
            </dd>
            {checklistCreado && (
              <>
                <dt>Checklist de Receta</dt>
                <dd>
                  #{checklistCreado.id} ({checklistCreado.total_etapas} etapas con
                  cantidades escaladas)
                </dd>
              </>
            )}
          </dl>
        </div>

        <div className="form-acciones">
          <button
            type="button"
            className="btn-guardar"
            onClick={() => onAsociarInsumos(loteCreado)}
          >
            Asociar insumos
          </button>
          <button type="button" className="btn-cancelar" onClick={registrarOtro}>
            Registrar otro lote
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Volver al historial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box" style={{ maxWidth: '820px' }}>
      <div className="modulo-header">
        <h1>Registrar lote y Escalar Receta</h1>
        <div className="subtitulo">
          Producción · Cálculo proporcional de ingredientes sin modificar la receta base
        </div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {errorProductos && (
        <div className="alerta-error">No se pudo cargar la lista de productos.</div>
      )}
      {sinProductosAsignados && (
        <div className="alerta-error">
          No tenés productos con recetas vigentes asignadas a tu legajo para elaborar.
        </div>
      )}

      <form onSubmit={handleGuardar} noValidate>
        <div className="form-group">
          <label htmlFor="producto">Producto a elaborar</label>
          <select
            id="producto"
            name="producto"
            value={form.producto}
            onChange={handleProductoChange}
            disabled={cargandoDatos || sinProductosAsignados}
          >
            <option value="" disabled>
              {cargandoDatos
                ? 'Cargando productos asignados...'
                : 'Seleccione un producto'}
            </option>
            {productosAsignados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="fecha">Fecha de producción</label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            max={obtenerFechaLocalHoy()}
            value={form.fecha}
            onChange={handleFechaChange}
          />
        </div>

        {recetaAsociada && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--code-bg)',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
            }}
          >
            <strong>Receta Vigente Base:</strong> {recetaAsociada.nombre} (v
            {versionVigente?.version ?? 1}) ·{' '}
            <strong>Rendimiento Base:</strong> {rendimientoBase} {unidad}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
            gap: '1rem',
          }}
        >
          <div className="form-group">
            <label htmlFor="cantidad">
              Cantidad objetivo a producir
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="0.01"
              step="any"
              placeholder="Ej: 36"
              value={form.cantidad}
              onChange={handleCantidadChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="factor">Factor multiplicador (Escala)</label>
            <input
              id="factor"
              name="factor"
              type="number"
              min="0.01"
              step="any"
              placeholder="Ej: 1.5 o 2 para duplicar"
              value={factorInput}
              onChange={handleFactorChange}
              disabled={!recetaAsociada}
            />
          </div>
        </div>

        {recetaAsociada && etapasBase.length > 0 && (
          <div style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-texto)' }}>
                Cantidades Recalculadas por Ingrediente
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-sec)' }}>
                Factor aplicado:{' '}
                <strong>
                  {factorActual > 0 ? `×${redondearCantidad(factorActual)}` : '—'}
                </strong>{' '}
                (Solo lectura · No modifica la receta original)
              </span>
            </div>

            <div className="tabla-wrapper">
              <table className="tabla-custom">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Ingrediente / Insumo</th>
                    <th>Cant. Receta Base ({rendimientoBase} {unidad})</th>
                    <th>
                      Cant. Escalada a Utilizar (
                      {form.cantidad !== '' && Number(form.cantidad) > 0
                        ? `${form.cantidad} ${unidad}`
                        : '—'}
                      )
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {etapasBase.map((etapa) => {
                    const cantEscalada =
                      factorActual > 0
                        ? redondearCantidad(Number(etapa.cantidad) * factorActual)
                        : null;

                    return (
                      <tr key={etapa.id}>
                        <td style={{ fontWeight: 500 }}>{etapa.nombre}</td>
                        <td>
                          {etapa.nombre_ingrediente ?? `Tipo de insumo #${etapa.tipo_insumo_id}`}
                          {etapa.es_aditivo ? ' (Aditivo)' : ''}
                        </td>
                        <td style={{ color: 'var(--color-texto-sec)' }}>
                          {etapa.cantidad} {etapa.unidad_medida}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-exito-texto, #10b981)' }}>
                          {cantEscalada !== null
                            ? `${cantEscalada} ${etapa.unidad_medida}`
                            : 'Ingrese cantidad > 0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || sinProductosAsignados}
          >
            {loading ? 'Iniciando lote...' : 'Iniciar lote y generar checklist'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};