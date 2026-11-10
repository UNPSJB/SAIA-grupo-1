import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { TipoInsumoDetalle } from './tipos';

interface VerDetalleTipoInsumoProps {
  id: number;
  onVolver: () => void;
  onVerLote?: (loteId: number) => void;
}

export const VerDetalleTipoInsumo: React.FC<VerDetalleTipoInsumoProps> = ({
  id,
  onVolver,
  onVerLote,
}) => {
  const [detalle, setDetalle] = useState<TipoInsumoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/insumos/tipos/${id}/detalle`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setDetalle(data);
        } else if (!cancelado) {
          setErrorMsg('No se pudo cargar el detalle del tipo de insumo.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar el detalle.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  const renderBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'VENCIDO':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
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
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
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
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a',
            }}
          >
            Vigente
          </span>
        );
      case 'AGOTADO':
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              color: '#64748b',
            }}
          >
            Agotado
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="modulo-container formulario-box">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando información del tipo de insumo...</p>
      </div>
    );
  }

  if (errorMsg || !detalle) {
    return (
      <div className="modulo-container formulario-box">
        <div className="alerta-error">{errorMsg || 'No se encontró el tipo de insumo.'}</div>
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>{detalle.nombre}</h1>
          <div className="subtitulo">Detalle de Tipo de Insumo e Historial de Lotes</div>
        </div>

        <div>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--code-bg, rgba(255, 255, 255, 0.03))',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border, #334155)',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Nombre Genérico</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{detalle.nombre}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Unidad de Medida</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0', textTransform: 'capitalize' }}>{detalle.unidadMedida}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Estado</span>
          <p style={{ margin: '4px 0 0' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
                backgroundColor: detalle.activo ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: detalle.activo ? '#16a34a' : '#dc2626',
              }}
            >
              {detalle.activo ? 'Activo' : 'Inactivo'}
            </span>
          </p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Descripción</span>
          <p style={{ margin: '4px 0 0', color: 'var(--color-texto)' }}>{detalle.descripcion || 'Sin descripción registrada.'}</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Historial de Lotes Recibidos</h2>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Nombre Específico</th>
              <th>Proveedor</th>
              <th>Fecha Recepción</th>
              <th>Fecha Vencimiento</th>
              <th>Cant. Recibida</th>
              <th>Stock Actual</th>
              <th>Estado</th>
              {onVerLote && <th className="acciones-col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {detalle.lotes_historicos.length === 0 ? (
              <tr>
                <td colSpan={onVerLote ? 9 : 8} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se han registrado lotes para este tipo de insumo.
                </td>
              </tr>
            ) : (
              detalle.lotes_historicos.map((lote) => (
                <tr key={lote.id}>
                  <td style={{ fontWeight: 600 }}>{lote.lote}</td>
                  <td>{lote.nombre}</td>
                  <td>{lote.proveedor_nombre || '-'}</td>
                  <td>{lote.fechaRecepcion}</td>
                  <td>{lote.fechaVencimiento || 'No perecedero'}</td>
                  <td>
                    {lote.cantRecibida} {lote.medida}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {lote.stock} {lote.medida}
                  </td>
                  <td>{renderBadgeEstado(lote.estadoVencimiento)}</td>
                  {onVerLote && (
                    <td className="acciones-col">
                      <button
                        className="btn-icon btn-editar"
                        title="Ver lote y trazabilidad"
                        onClick={() => onVerLote(lote.id)}
                      >
                        👁
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
