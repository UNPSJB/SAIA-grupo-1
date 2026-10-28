import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { mensajeDeError } from '../incidentes/tipos';
import { formatearFecha } from './tipos';
import type { LoteProduccion } from './tipos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface DetalleLoteProps {
  loteId: number;
  onVolver: () => void;
  /** Solo para el personal operativo; igual se muestra únicamente si el lote sigue abierto */
  onGestionarInsumos?: (lote: LoteProduccion) => void;
}

/** Detalle de un lote en modo solo lectura: qué se produjo, cuándo, quién y con qué insumos. */
export const DetalleLote: React.FC<DetalleLoteProps> = ({ loteId, onVolver, onGestionarInsumos }) => {
  const [lote, setLote] = useState<LoteProduccion | null>(null);
  const [error, setError] = useState<string | null>(null);

  // se pide de nuevo cada vez (y no se reusa el del listado) por si se le acaban de cambiar los insumos
  useEffect(() => {
    let cancelado = false;
    apiFetch(`/lotes/${loteId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(mensajeDeError(errorData.detail, 'No se pudo cargar el lote.'));
        }
        const data: LoteProduccion = await res.json();
        if (!cancelado) setLote(data);
      })
      .catch((err: unknown) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
      });
    return () => {
      cancelado = true;
    };
  }, [loteId]);

  if (error || !lote) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Detalle del lote</h1>
          <div className="subtitulo">Producción</div>
        </div>
        {error ? <div className="alerta-error">{error}</div> : <p>Cargando lote...</p>}
        <div className="form-acciones">
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Volver al historial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modulo-container lote-insumos">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lote {lote.codigo}</h1>
          <div className="subtitulo">
            {lote.producto.nombre} ·{' '}
            <span className={`badge-status ${lote.editable ? 'activo' : 'cerrado'}`}>
              {lote.editable ? 'Abierto' : 'Cerrado · solo lectura'}
            </span>
          </div>
        </div>
        {lote.editable && onGestionarInsumos && (
          <button type="button" className="btn-agregar" onClick={() => onGestionarInsumos(lote)}>
            Gestionar insumos
          </button>
        )}
      </div>

      <dl className="lote-detalle-datos">
        <dt>Producto</dt>
        <dd>{lote.producto.nombre}</dd>
        <dt>Fecha de producción</dt>
        <dd>{formatearFecha(lote.fecha)}</dd>
        <dt>Cantidad producida</dt>
        <dd>
          {lote.cantidad} {lote.producto.unidadMedida}
        </dd>
        <dt>Responsable</dt>
        <dd>
          {lote.nombre_responsable} (legajo {lote.responsable_legajo})
        </dd>
      </dl>

      <h2 className="lote-detalle-titulo">Insumos utilizados</h2>
      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Lote del proveedor</th>
              <th>Cantidad utilizada</th>
            </tr>
          </thead>
          <tbody>
            {lote.insumos.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Este lote no tiene insumos asociados.
                </td>
              </tr>
            ) : (
              lote.insumos.map((i) => (
                <tr key={i.insumo.id}>
                  <td style={{ fontWeight: 500 }}>{i.insumo.nombre}</td>
                  <td>{i.insumo.lote}</td>
                  <td>
                    {i.cantidad} {i.insumo.medida}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver al historial
        </button>
      </div>
    </div>
  );
};
