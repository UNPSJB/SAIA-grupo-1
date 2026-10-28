import React, { useState } from 'react';
import { apiFetch } from '../../api/client';
import { mensajeDeError } from '../incidentes/tipos';
import {
  NOMBRE_PRODUCTO_MAX,
  NUEVO_PRODUCTO,
  UNIDADES_MEDIDA,
  formatearFecha,
  obtenerFechaLocalHoy,
} from './tipos';
import type { LoteForm, LoteProduccion } from './tipos';
import { useProductos } from './useProductos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface NuevoLoteProps {
  /** Acceso directo para asociar insumos al lote recién guardado */
  onAsociarInsumos: (lote: LoteProduccion) => void;
  onVolver: () => void;
}

const formularioInicial = (): LoteForm => ({
  producto: '',
  productoNuevo: '',
  unidadProductoNuevo: '',
  fecha: obtenerFechaLocalHoy(),
  cantidad: '',
});

export const NuevoLote: React.FC<NuevoLoteProps> = ({ onAsociarInsumos, onVolver }) => {
  const { productos, cargando, error: errorProductos, recargar } = useProductos();
  const [form, setForm] = useState<LoteForm>(formularioInicial);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loteCreado, setLoteCreado] = useState<LoteProduccion | null>(null);

  // Si todavía no hay productos, la única opción posible es crear uno
  const productoElegido = form.producto || (!cargando && productos.length === 0 ? NUEVO_PRODUCTO : '');
  const creaProducto = productoElegido === NUEVO_PRODUCTO;
  // la cantidad se carga en la unidad del producto: la del existente o la que se elija para el nuevo
  const unidad = creaProducto
    ? form.unidadProductoNuevo
    : productos.find((p) => String(p.id) === productoElegido)?.unidad_medida ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCantidad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setForm({ ...form, cantidad: valor === '' ? '' : Number(valor) });
  };

  // Mismas reglas que el backend; devuelve el mensaje del primer problema o null si está todo bien
  const validar = (): string | null => {
    if (!productoElegido) return 'Debe seleccionar un producto o crear uno nuevo.';
    if (creaProducto) {
      const nombre = form.productoNuevo.trim();
      if (!nombre) return 'El nombre del producto no puede estar vacío.';
      if (nombre.length > NOMBRE_PRODUCTO_MAX) {
        return `El nombre del producto no puede superar los ${NOMBRE_PRODUCTO_MAX} caracteres.`;
      }
      if (!form.unidadProductoNuevo) return 'Debe indicar la unidad de medida del producto nuevo.';
    }
    if (!form.fecha) return 'Debe indicar la fecha del lote.';
    if (form.fecha > obtenerFechaLocalHoy()) return 'La fecha del lote no puede ser posterior a la fecha actual.';
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

    // Un producto existente viaja por id; uno nuevo, por nombre y unidad (el backend lo crea junto con el lote)
    const payload = {
      ...(creaProducto
        ? { producto_nombre: form.productoNuevo.trim(), producto_unidad_medida: form.unidadProductoNuevo }
        : { producto_id: Number(productoElegido) }),
      fecha: form.fecha,
      cantidad: Number(form.cantidad),
    };

    setLoading(true);
    try {
      const res = await apiFetch('/lotes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(mensajeDeError(errorData.detail, 'Error al registrar el lote.'));
      }
      setLoteCreado(await res.json());
      recargar(); // el producto nuevo (si hubo) tiene que aparecer en el selector
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const registrarOtro = () => {
    setLoteCreado(null);
    setErrorMsg(null);
    setForm(formularioInicial());
  };

  if (loteCreado) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Lote registrado</h1>
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
              {loteCreado.cantidad} {loteCreado.producto.unidad_medida}
            </dd>
          </dl>
        </div>

        <div className="form-acciones">
          <button type="button" className="btn-guardar" onClick={() => onAsociarInsumos(loteCreado)}>
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
        <div className="alerta-error">No se pudo cargar la lista de productos. Podés crear uno nuevo igualmente.</div>
      )}

      <form onSubmit={handleGuardar} noValidate>
        <div className="form-group">
          <label htmlFor="producto">Producto</label>
          <select
            id="producto"
            name="producto"
            value={productoElegido}
            onChange={handleChange}
            disabled={cargando}
          >
            <option value="" disabled>
              {cargando ? 'Cargando productos...' : 'Seleccione un producto'}
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
            <option value={NUEVO_PRODUCTO}>➕ Crear producto nuevo…</option>
          </select>
        </div>

        {creaProducto && (
          <div className="form-group">
            <label htmlFor="productoNuevo">Nombre del producto nuevo</label>
            <input
              id="productoNuevo"
              name="productoNuevo"
              type="text"
              placeholder="Ej: Pan lactal"
              maxLength={NOMBRE_PRODUCTO_MAX}
              value={form.productoNuevo}
              onChange={handleChange}
              autoFocus
            />
          </div>
        )}

        {creaProducto && (
          <div className="form-group">
            <label htmlFor="unidadProductoNuevo">Unidad de medida del producto</label>
            <select
              id="unidadProductoNuevo"
              name="unidadProductoNuevo"
              value={form.unidadProductoNuevo}
              onChange={handleChange}
            >
              <option value="" disabled>
                Seleccione una unidad
              </option>
              {UNIDADES_MEDIDA.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar lote'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
