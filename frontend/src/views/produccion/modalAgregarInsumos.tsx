import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { mensajeDeError } from '../incidentes/tipos';
import type { InsumoDisponible, LoteProduccion } from './tipos';
import type { TipoInsumo } from '../tipoInsumo/tipos';
import { useInsumosDisponibles } from './useInsumosDisponibles';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface ModalAgregarInsumosProps {
  lote: LoteProduccion;
  onClose: () => void;
  onGuardado: (lote: LoteProduccion) => void;
}

interface Fila {
  clave: number;
  tipo_id: string;
  insumo_id: string;
  cantidad: number | '';
}

const sinClave = (errores: Record<number, string>, clave: number): Record<number, string> => {
  const copia = { ...errores };
  delete copia[clave];
  return copia;
};

const formatFecha = (dateStr?: string | null): string => {
  if (!dateStr) return 'No perecedero';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
  } catch {
    return dateStr;
  }
};

export const ModalAgregarInsumos: React.FC<ModalAgregarInsumosProps> = ({ lote, onClose, onGuardado }) => {
  const { insumos, cargando, error: errorInsumos, recargar } = useInsumosDisponibles();
  const [tipos, setTipos] = useState<TipoInsumo[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);

  const proximaClave = useRef(1);
  const nuevaFila = (): Fila => ({ clave: proximaClave.current++, tipo_id: '', insumo_id: '', cantidad: '' });

  const [filas, setFilas] = useState<Fila[]>([{ clave: 0, tipo_id: '', insumo_id: '', cantidad: '' }]);
  const [erroresFila, setErroresFila] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargarTipos() {
      try {
        let res = await apiFetch('/insumos/tipos/?solo_activos=true');
        if (res.status === 403 || res.status === 404) {
          res = await apiFetch('/insumos/tipos/');
        }
        if (!cancelado && res.ok) {
          const data: TipoInsumo[] = await res.json();
          setTipos(data);
        }
      } catch {
        if (!cancelado) setTipos([]);
      } finally {
        if (!cancelado) setCargandoTipos(false);
      }
    }
    cargarTipos();
    return () => {
      cancelado = true;
    };
  }, []);

  const yaAsociados = new Set(lote.insumos.map((i) => i.insumo.id));
  const elegibles = insumos.filter((i) => !yaAsociados.has(i.id));
  const buscar = (id: string): InsumoDisponible | undefined => insumos.find((i) => String(i.id) === id);

  const cambiarFila = (clave: number, cambios: Partial<Fila>) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.clave !== clave) return f;
        if (cambios.tipo_id !== undefined && cambios.tipo_id !== f.tipo_id) {
          return { ...f, ...cambios, insumo_id: '', cantidad: '' };
        }
        return { ...f, ...cambios };
      })
    );
    setErroresFila((prev) => sinClave(prev, clave));
  };

  const quitarFila = (clave: number) => {
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
    setErroresFila((prev) => sinClave(prev, clave));
  };

  const validar = (): Record<number, string> => {
    const errores: Record<number, string> = {};
    for (const fila of filas) {
      if (!fila.tipo_id) {
        errores[fila.clave] = 'Debe seleccionar un tipo de insumo.';
        continue;
      }
      const insumo = buscar(fila.insumo_id);
      if (!insumo) {
        errores[fila.clave] = 'Debe seleccionar un lote de insumo.';
      } else if (fila.cantidad === '') {
        errores[fila.clave] = 'Indique la cantidad utilizada.';
      } else if (fila.cantidad <= 0) {
        errores[fila.clave] = 'La cantidad debe ser estrictamente mayor a cero.';
      } else if (fila.cantidad > insumo.stock) {
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
      recargar();
    } finally {
      setLoading(false);
    }
  };

  const renderBadge = (estado?: string | null) => {
    switch (estado) {
      case 'VENCIDO':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#dc2626',
            }}
          >
            Vencido
          </span>
        );
      case 'PROXIMO_A_VENCER':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#ca8a04',
            }}
          >
            Próximo a Vencer
          </span>
        );
      case 'VIGENTE':
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a',
            }}
          >
            Vigente
          </span>
        );
      default:
        return null;
    }
  };

  const sinOpciones = !cargando && !errorInsumos && elegibles.length === 0;

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !loading && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Asociar insumos al lote</DialogTitle>
          <DialogDescription>
            Lote {lote.codigo} · {lote.producto.nombre}. Seleccione el tipo de insumo y luego el lote individual ordenado por FEFO.
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
          <div className="insumos-filas" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filas.map((fila, indice) => {
              const elegido = buscar(fila.insumo_id);
              const elegidosEnOtras = new Set(
                filas.filter((f) => f.clave !== fila.clave && f.insumo_id).map((f) => f.insumo_id)
              );

              const lotesDelTipo = elegibles
                .filter((i) => {
                  if (elegidosEnOtras.has(String(i.id))) return false;
                  if (!fila.tipo_id) return false;
                  return i.tipo_insumo_id !== undefined && i.tipo_insumo_id !== null
                    ? String(i.tipo_insumo_id) === fila.tipo_id
                    : true;
                })
                .sort((a, b) => {
                  if (!a.fechaVencimiento) return 1;
                  if (!b.fechaVencimiento) return -1;
                  return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
                });

              const error = erroresFila[fila.clave];

              return (
                <div
                  key={fila.clave}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--code-bg, rgba(255, 255, 255, 0.02))',
                    border: '1px solid var(--border, #334155)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor={`tipo-${fila.clave}`} style={{ fontSize: '12px', fontWeight: 600 }}>
                        1. Tipo de Insumo *
                      </label>
                      <select
                        id={`tipo-${fila.clave}`}
                        value={fila.tipo_id}
                        onChange={(e) => cambiarFila(fila.clave, { tipo_id: e.target.value })}
                        disabled={cargandoTipos || cargando}
                      >
                        <option value="" disabled>
                          {cargandoTipos ? 'Cargando tipos...' : 'Seleccione tipo...'}
                        </option>
                        {tipos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} ({t.unidadMedida})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor={`insumo-${fila.clave}`} style={{ fontSize: '12px', fontWeight: 600 }}>
                        2. Lote individual (FEFO) *
                      </label>
                      <select
                        id={`insumo-${fila.clave}`}
                        value={fila.insumo_id}
                        onChange={(e) => cambiarFila(fila.clave, { insumo_id: e.target.value })}
                        disabled={!fila.tipo_id || cargando}
                        aria-invalid={Boolean(error)}
                      >
                        <option value="" disabled>
                          {!fila.tipo_id
                            ? '← Primero elija un tipo'
                            : lotesDelTipo.length === 0
                            ? 'Sin stock para este tipo'
                            : 'Seleccione un lote disponible...'}
                        </option>
                        {lotesDelTipo.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nombre} · Lote: {i.lote} · Vto: {formatFecha(i.fechaVencimiento)} · Disp: {i.stock} {i.medida}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor={`cantidad-${fila.clave}`} style={{ fontSize: '12px', fontWeight: 600 }}>
                        3. Cantidad{elegido ? ` (${elegido.medida})` : ''} *
                      </label>
                      <input
                        id={`cantidad-${fila.clave}`}
                        type="number"
                        min="0.01"
                        step="any"
                        max={elegido?.stock}
                        placeholder={elegido ? `Máx ${elegido.stock}` : '0'}
                        value={fila.cantidad}
                        onChange={(e) =>
                          cambiarFila(fila.clave, { cantidad: e.target.value === '' ? '' : Number(e.target.value) })
                        }
                        disabled={!fila.insumo_id}
                        aria-invalid={Boolean(error)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-icon btn-eliminar"
                      title="Quitar fila"
                      aria-label={`Quitar fila ${indice + 1}`}
                      onClick={() => quitarFila(fila.clave)}
                      disabled={filas.length === 1}
                      style={{ height: '38px', width: '38px', marginBottom: '2px' }}
                    >
                      🗑
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    {error ? (
                      <span className="campo-error" style={{ color: '#ef4444', fontWeight: 500 }}>
                        {error}
                      </span>
                    ) : (
                      elegido && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            Stock disponible: <strong>{elegido.stock} {elegido.medida}</strong>
                          </span>
                          {renderBadge(elegido.estadoVencimiento)}
                        </div>
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
              const fila = nuevaFila();
              setFilas((prev) => [...prev, fila]);
            }}
            disabled={filas.length >= elegibles.length}
            style={{ marginTop: '12px' }}
          >
            + Agregar otro insumo
          </button>

          <div className="form-acciones" style={{ marginTop: '20px' }}>
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
