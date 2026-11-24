import React, { useCallback, useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import type { LoteInsumoHistorico, TipoInsumoDetalle } from './tipos';

interface VerDetalleTipoInsumoProps {
  id: number;
  onVolver: () => void;
  onVerLote?: (loteId: number) => void;
  onEditarLote?: (loteId: number) => void;
}

const formatDate = (dateStr?: string | null) => {
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

export const VerDetalleTipoInsumo: React.FC<VerDetalleTipoInsumoProps> = ({
  id,
  onVolver,
  onVerLote,
  onEditarLote,
}) => {
  const [detalle, setDetalle] = useState<TipoInsumoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);
  const [loteAEliminar, setLoteAEliminar] = useState<LoteInsumoHistorico | null>(null);
  const [dialogEliminarAbierto, setDialogEliminarAbierto] = useState(false);

  const cargarDetalle = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/insumos/tipos/${id}/detalle`);
      if (res.ok) {
        const data = await res.json();
        setDetalle(data);
      } else {
        setErrorMsg('No se pudo cargar el detalle del tipo de insumo.');
      }
    } catch {
      setErrorMsg('Error de conexión al cargar el detalle.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  const abrirConfirmacionEliminarLote = (lote: LoteInsumoHistorico) => {
    setLoteAEliminar(lote);
    setDialogEliminarAbierto(true);
  };

  const ejecutarEliminarLote = async () => {
    if (!loteAEliminar) return;
    try {
      const res = await apiFetch(`/insumos/${loteAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarDetalle();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || 'No se pudo dar de baja el lote de insumo.');
      }
    } catch {
      setErrorDialogMsg('Error de conexión al dar de baja el lote.');
    } finally {
      setDialogEliminarAbierto(false);
      setLoteAEliminar(null);
    }
  };

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

  const lotes = detalle.lotes_historicos || detalle.lotes || [];

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
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
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Equivalencia en Gramos</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
            {detalle.equivalencia_gramos != null && detalle.equivalencia_gramos > 0
              ? `${detalle.cantidad_referencia ?? 1} ${detalle.unidadMedida} = ${detalle.equivalencia_gramos} g`
              : 'Sin datos'}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Clasificación</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
            {detalle.es_aditivo
              ? `Aditivo (${detalle.clase_funcional || 'General'}${
                  detalle.numero_ins
                    ? ` · ${detalle.numero_ins.toUpperCase().startsWith('INS') ? detalle.numero_ins : `INS ${detalle.numero_ins}`}`
                    : ''
                })`
              : 'Ingrediente'}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Stock Total Activo</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
            {detalle.stock_total ?? 0} {detalle.unidadMedida}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Estado</span>
          <p style={{ margin: '4px 0 0' }}>
            <span className={`badge-status ${detalle.activo ? 'activo' : 'inactivo'}`}>
              {detalle.activo ? 'Activo' : 'Inactivo'}
            </span>
          </p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Descripción</span>
          <p style={{ margin: '4px 0 0', color: 'var(--color-texto)' }}>
            {detalle.descripcion || 'Sin datos'}
          </p>
        </div>
      </div>

      <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Alérgenos Declarados</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {detalle.alergenos && detalle.alergenos.length > 0 ? (
              detalle.alergenos.map((alg) => (
                <span
                  key={alg.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {alg.simbolo && (
                    <img src={alg.simbolo} alt={alg.nombre} style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                  )}
                  {alg.nombre}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--color-texto-sec)' }}>Ninguno</span>
            )}
          </div>
        </div>

      <h2 style={{ fontSize: '1.15rem', marginTop: '20px', marginBottom: '12px' }}>Historial de Lotes Recibidos</h2>

      <div className="tabla-wrapper" style={{ overflowX: 'auto' }}>
        <table className="tabla-custom tabla-insumos">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Nombre</th>
              <th>Proveedor</th>
              <th>Recepción</th>
              <th>Vencimiento</th>
              <th>Recibido</th>
              <th>Stock</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se han registrado lotes para este tipo de insumo.
                </td>
              </tr>
            ) : (
              lotes.map((lote) => (
                <tr key={lote.id} style={{ opacity: lote.activo ? 1 : 0.6 }}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{lote.lote}</td>
                  <td>{lote.nombre}</td>
                  <td>{lote.proveedor_nombre || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(lote.fechaRecepcion)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(lote.fechaVencimiento)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {lote.cantRecibida} {lote.medida}
                  </td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {lote.stock} {lote.medida}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{renderBadgeEstado(lote.estadoVencimiento)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      {onVerLote && (
                        <button
                          className="btn-icon btn-ver"
                          title="Ver lote y trazabilidad"
                          onClick={() => onVerLote(lote.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                        </button>
                      )}
                      {lote.activo && onEditarLote && (
                        <button
                          className="btn-icon btn-editar"
                          title="Editar lote"
                          onClick={() => onEditarLote(lote.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                        </button>
                      )}
                      {lote.activo && (
                        <button
                          className="btn-icon btn-eliminar"
                          title="Dar de baja lote"
                          onClick={() => abrirConfirmacionEliminarLote(lote)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmAlertDialog
        open={dialogEliminarAbierto}
        title="¿Dar de baja lote?"
        description={`¿Estás seguro de que deseas dar de baja el lote "${loteAEliminar?.lote}" de "${loteAEliminar?.nombre}"?`}
        confirmText="Confirmar Baja"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminarLote}
        onCancel={() => {
          setDialogEliminarAbierto(false);
          setLoteAEliminar(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ''}
        onClose={() => setErrorDialogMsg(null)}
      />
    </div>
  );
};
