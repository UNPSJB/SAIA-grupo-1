import React, { useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { mensajeDeError } from '../incidentes/tipos';
import type { InsumoDisponible, LoteProduccion } from './tipos';
import { useInsumosDisponibles } from './useInsumosDisponibles';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface ModalAgregarInsumosProps {
  lote: LoteProduccion;
  onClose: () => void;
  /** Recibe el lote actualizado que devuelve el backend */
  onGuardado: (lote: LoteProduccion) => void;
}

interface Fila {
  /** clave estable para React (las filas se pueden quitar del medio) */
  clave: number;
  insumo_id: string;
  cantidad: number | '';
}

const sinClave = (errores: Record<number, string>, clave: number): Record<number, string> => {
  const copia = { ...errores };
  delete copia[clave];
  return copia;
};

/**
 * Se monta solo mientras está abierto: cada vez arranca con una fila vacía y el stock recién pedido.
 */
export const ModalAgregarInsumos: React.FC<ModalAgregarInsumosProps> = ({ lote, onClose, onGuardado }) => {
  const { insumos, cargando, error: errorInsumos, recargar } = useInsumosDisponibles();
  // la primera fila usa la clave 0; las que se agregan después toman de acá (solo en eventos)
  const proximaClave = useRef(1);
  const nuevaFila = (): Fila => ({ clave: proximaClave.current++, insumo_id: '', cantidad: '' });

  const [filas, setFilas] = useState<Fila[]>([{ clave: 0, insumo_id: '', cantidad: '' }]);
  const [erroresFila, setErroresFila] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const yaAsociados = new Set(lote.insumos.map((i) => i.insumo.id));
  const elegibles = insumos.filter((i) => !yaAsociados.has(i.id));
  const buscar = (id: string): InsumoDisponible | undefined => insumos.find((i) => String(i.id) === id);

  const cambiarFila = (clave: number, cambios: Partial<Fila>) => {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
    setErroresFila((prev) => sinClave(prev, clave));
  };

  const quitarFila = (clave: number) => {
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
    setErroresFila((prev) => sinClave(prev, clave));
  };

  // Mismas reglas que el backend; un mensaje por fila con problemas
  const validar = (): Record<number, string> => {
    const errores: Record<number, string> = {};
    for (const fila of filas) {
      const insumo = buscar(fila.insumo_id);
      if (!insumo) errores[fila.clave] = 'Seleccione un insumo.';
      else if (fila.cantidad === '') errores[fila.clave] = 'Indique la cantidad utilizada.';
      else if (fila.cantidad <= 0) errores[fila.clave] = 'La cantidad debe ser mayor a cero.';
      else if (fila.cantidad > insumo.stock) {
        errores[fila.clave] = `Supera el stock disponible (${insumo.stock} ${insumo.medida}).`;
      }
    }
    return errores;
  };

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const errores = validar();
    setErroresFila(errores);
    if (Object.keys(errores).length > 0) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/lotes/${lote.id}/insumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumos: filas.map((f) => ({ insumo_id: Number(f.insumo_id), cantidad: Number(f.cantidad) })),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(mensajeDeError(errorData.detail, 'Error al asociar los insumos.'));
      }
      onGuardado(await res.json());
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
      recargar(); // si falló por stock, el stock que se muestra pudo haber cambiado
    } finally {
      setLoading(false);
    }
  };

  const sinOpciones = !cargando && !errorInsumos && elegibles.length === 0;

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !loading && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Agregar insumos</DialogTitle>
          <DialogDescription>
            Lote {lote.codigo} · {lote.producto.nombre}. La cantidad se carga en la unidad del insumo y se descuenta
            de su stock.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && <div className="alerta-error">{errorMsg}</div>}
        {errorInsumos && <div className="alerta-error">No se pudo cargar la lista de insumos.</div>}
        {sinOpciones && (
          <div className="alerta-error">
            No quedan insumos con stock para asociar a este lote.
          </div>
        )}

        <form onSubmit={handleGuardar} noValidate>
          <div className="insumos-filas">
            {filas.map((fila, indice) => {
              const elegido = buscar(fila.insumo_id);
              // en cada selector no se ofrecen los insumos ya elegidos en otras filas
              const elegidosEnOtras = new Set(
                filas.filter((f) => f.clave !== fila.clave).map((f) => f.insumo_id),
              );
              const opciones = elegibles.filter((i) => !elegidosEnOtras.has(String(i.id)));
              const error = erroresFila[fila.clave];

              return (
                <div key={fila.clave} className="insumo-fila">
                  <div className="form-group insumo-fila-insumo">
                    <label htmlFor={`insumo-${fila.clave}`}>Insumo {filas.length > 1 ? indice + 1 : ''}</label>
                    <select
                      id={`insumo-${fila.clave}`}
                      value={fila.insumo_id}
                      onChange={(e) => cambiarFila(fila.clave, { insumo_id: e.target.value })}
                      disabled={cargando}
                      aria-invalid={Boolean(error)}
                    >
                      <option value="" disabled>
                        {cargando ? 'Cargando insumos...' : 'Seleccione un insumo'}
                      </option>
                      {opciones.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} · lote {i.lote}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group insumo-fila-cantidad">
                    <label htmlFor={`cantidad-${fila.clave}`}>
                      Cantidad{elegido ? ` (${elegido.medida})` : ''}
                    </label>
                    <input
                      id={`cantidad-${fila.clave}`}
                      type="number"
                      min="0.01"
                      step="any"
                      max={elegido?.stock}
                      placeholder="0"
                      value={fila.cantidad}
                      onChange={(e) =>
                        cambiarFila(fila.clave, { cantidad: e.target.value === '' ? '' : Number(e.target.value) })
                      }
                      aria-invalid={Boolean(error)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-icon btn-eliminar insumo-fila-quitar"
                    title="Quitar fila"
                    aria-label={`Quitar fila ${indice + 1}`}
                    onClick={() => quitarFila(fila.clave)}
                    disabled={filas.length === 1}
                  >
                    🗑
                  </button>

                  <div className="insumo-fila-pie">
                    {error ? (
                      <span className="campo-error">{error}</span>
                    ) : (
                      elegido && (
                        <span className="insumo-fila-stock">
                          Disponible: {elegido.stock} {elegido.medida}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-cancelar insumos-agregar-fila"
            onClick={() => {
              // fuera del updater: React puede llamarlo dos veces y saltearía claves
              const fila = nuevaFila();
              setFilas((prev) => [...prev, fila]);
            }}
            disabled={filas.length >= elegibles.length}
          >
            + Agregar otro insumo
          </button>

          <div className="form-acciones">
            <button type="submit" className="btn-guardar" disabled={loading || cargando || sinOpciones}>
              {loading ? 'Guardando...' : 'Guardar insumos'}
            </button>
            <button type="button" className="btn-cancelar" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
