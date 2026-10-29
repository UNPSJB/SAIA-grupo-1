import React, { useState } from 'react';
import { apiFetch } from '../../api/client';
import { mensajeDeError } from '../incidentes/tipos';
import { formatearFecha, obtenerFechaLocalHoy } from './tipos';
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
  fecha: obtenerFechaLocalHoy(),
  cantidad: '',
});

export const NuevoLote: React.FC<NuevoLoteProps> = ({ onAsociarInsumos, onVolver }) => {
  const { productos, cargando, error: errorProductos } = useProductos();
  const [form, setForm] = useState<LoteForm>(formularioInicial);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loteCreado, setLoteCreado] = useState<LoteProduccion | null>(null);

  // a un producto dado de baja no se le registran lotes
  const productosActivos = productos.filter((p) => p.activo);
  const sinProductos = !cargando && !errorProductos && productosActivos.length === 0;
  // la cantidad se carga en la unidad del producto
  const unidad = productosActivos.find((p) => String(p.id) === form.producto)?.unidadMedida ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCantidad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setForm({ ...form, cantidad: valor === '' ? '' : Number(valor) });
  };

  // Mismas reglas que el backend; devuelve el mensaje del primer problema o null si está todo bien
  const validar = (): string | null => {
    if (!form.producto) return 'Debe seleccionar un producto.';
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

    const payload = {
      producto_id: Number(form.producto),
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
              {loteCreado.cantidad} {loteCreado.producto.unidadMedida}
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
      {errorProductos && <div className="alerta-error">No se pudo cargar la lista de productos.</div>}
      {sinProductos && (
        <div className="alerta-error">
          No hay productos activos. Un administrador tiene que darlos de alta en Productos Elaborados.
        </div>
      )}

      <form onSubmit={handleGuardar} noValidate>
        <div className="form-group">
          <label htmlFor="producto">Producto</label>
          <select
            id="producto"
            name="producto"
            value={form.producto}
            onChange={handleChange}
            disabled={cargando || sinProductos}
          >
            <option value="" disabled>
              {cargando ? 'Cargando productos...' : 'Seleccione un producto'}
            </option>
            {productosActivos.map((p) => (
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
