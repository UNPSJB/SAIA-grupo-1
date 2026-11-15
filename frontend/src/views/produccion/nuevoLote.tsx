import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { mensajeDeError } from '../incidentes/tipos';
import { formatearFecha, obtenerFechaLocalHoy } from './tipos';
import type { LoteForm, LoteProduccion } from './tipos';
import { useProductos } from './useProductos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';
import type { RecetaConId, ChecklistReceta } from '../receta/tipos';

interface NuevoLoteProps {
  onAsociarInsumos: (lote: LoteProduccion) => void;
  onVolver: () => void;
  onChecklistGenerado?: (checklistId: number) => void;
}

const formularioInicial = (): LoteForm => ({
  producto: '',
  fecha: obtenerFechaLocalHoy(),
  cantidad: '',
});

export const NuevoLote: React.FC<NuevoLoteProps> = ({
  onAsociarInsumos,
  onVolver,
  onChecklistGenerado,
}) => {
  const { usuario } = useAuth();
  const { productos, cargando, error: errorProductos } = useProductos();
  const [form, setForm] = useState<LoteForm>(formularioInicial);
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

  //filtramos las recetas activas
  const recetasDelOperador = recetas.filter(
    (r) =>
      r.activo &&
      Boolean(r.version_vigente) &&
      Number(r.operario_legajo) === Number(usuario?.legajo)
  );

  //Obtenemos los ids de los productos que tienen receta asignada a este operador
  const idsProductosDelOperador = new Set(
    recetasDelOperador.map((r) => Number(r.id_producto))
  );

  // Mostramos en el desplegable solo los productos activos cuyas recetas están asociadas al operador
  const productosAsignados = productos.filter(
    (p) => p.activo && idsProductosDelOperador.has(Number(p.id))
  );

  const cargandoDatos = cargando || cargandoRecetas;
  const sinProductosAsignados =
    !cargandoDatos && !errorProductos && productosAsignados.length === 0;

  // La cantidad se carga en la unidad del producto seleccionado
  const unidad =
    productosAsignados.find((p) => String(p.id) === form.producto)?.unidadMedida ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCantidad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setForm({ ...form, cantidad: valor === '' ? '' : Number(valor) });
  };

  const validar = (): string | null => {
    if (!form.producto) return 'Debe seleccionar un producto.';
    if (!form.fecha) return 'Debe indicar la fecha del lote.';
    if (form.fecha > obtenerFechaLocalHoy())
      return 'La fecha del lote no puede ser posterior a la fecha actual.';
    if (form.cantidad === '') return 'Debe indicar la cantidad producida.';
    if (Number(form.cantidad) <= 0) return 'La cantidad producida debe ser mayor a cero.';
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

    const payloadLote = {
      producto_id: Number(form.producto),
      fecha: form.fecha,
      cantidad: Number(form.cantidad),
    };

    setLoading(true);
    try {
      // 1. Creamos el lote de producción
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

      // 2. Generamos automáticamente el checklist del operador para este producto/fecha
      const resChecklist = await apiFetch('/recetas/checklist/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          id_producto: Number(form.producto),
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
        // Si ya había generado su checklist hoy, igual le mostramos el lote creado y el aviso si corresponde
        console.warn('Aviso al generar checklist:', errChecklist.detail);
      }

      setLoteCreado(nuevoLote);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const registrarOtro = () => {
    setLoteCreado(null);
    setChecklistCreado(null);
    setErrorMsg(null);
    setForm(formularioInicial());
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
            <dt>Cantidad</dt>
            <dd>
              {loteCreado.cantidad} {loteCreado.producto.unidadMedida}
            </dd>
            {checklistCreado && (
              <>
                <dt>Checklist de Receta</dt>
                <dd>#{checklistCreado.id} ({checklistCreado.total_etapas} etapas generadas)</dd>
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
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Registrar lote</h1>
        <div className="subtitulo">Producción</div>
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
            onChange={handleChange}
            disabled={cargandoDatos || sinProductosAsignados}
          >
            <option value="" disabled>
              {cargandoDatos ? 'Cargando productos asignados...' : 'Seleccione un producto'}
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
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cantidad">Cantidad producida{unidad && ` (${unidad})`}</label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            min="0.01"
            step="any"
            placeholder="Introduce la cantidad"
            value={form.cantidad}
            onChange={handleCantidad}
          />
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || sinProductosAsignados}
          >
            {loading ? 'Generando...' : 'Generar checklist'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};