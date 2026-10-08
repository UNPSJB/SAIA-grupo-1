import React, { useEffect, useState } from 'react';
import type { EstadoIncidente, Incidente } from './tipos';
import {
  ACCION_CORRECTIVA_MAX,
  ETIQUETAS_ESTADO,
  MOTIVO_REAPERTURA_MAX,
  esIncidenteAbierto,
  formatearFecha,
  mensajeDeError,
} from './tipos';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import '../../styles/incidentes.css';

interface DetalleIncidenteModalProps {
  incidente: Incidente | null;
  onClose: () => void;
  onEstadoActualizado?: (incidenteActualizado: Incidente) => void;
}

export const DetalleIncidenteModal: React.FC<DetalleIncidenteModalProps> = ({
  incidente: incidenteProp,
  onClose,
  onEstadoActualizado,
}) => {
  const { esAdministrador } = useAuth();
  const [incidente, setIncidente] = useState<Incidente | null>(incidenteProp);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargandoFoto, setCargandoFoto] = useState(Boolean(incidenteProp?.foto_url));
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [zoomFoto, setZoomFoto] = useState(false);

  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [exitoEstado, setExitoEstado] = useState<string | null>(null);

  // Estados de formularios HDU #39 (Acción Correctiva y Reapertura)
  const [mostrandoFormCierre, setMostrandoFormCierre] = useState(false);
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [mostrandoFormReapertura, setMostrandoFormReapertura] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [errorReapertura, setErrorReapertura] = useState<string | null>(null);

  useEffect(() => {
    if (!incidente?.foto_url) return;

    let cancelado = false;
    let urlGenerada: string | null = null;

    apiFetch(`/incidentes/${incidente.id}/foto`)
      .then(async (res) => {
        if (cancelado) return;
        if (res.ok) {
          const blob = await res.blob();
          urlGenerada = URL.createObjectURL(blob);
          setFotoUrl(urlGenerada);
        } else {
          setErrorFoto('No se pudo cargar la imagen adjunta.');
        }
      })
      .catch(() => {
        if (!cancelado) setErrorFoto('Error al obtener la imagen del servidor.');
      })
      .finally(() => {
        if (!cancelado) setCargandoFoto(false);
      });

    return () => {
      cancelado = true;
      if (urlGenerada) {
        URL.revokeObjectURL(urlGenerada);
      }
    };
  }, [incidente?.id, incidente?.foto_url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomFoto) {
          setZoomFoto(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomFoto, onClose]);

  if (!incidente) return null;

  const esAbierto = esIncidenteAbierto(incidente.estado);

  const cambiarEstado = async (nuevoEstado: EstadoIncidente) => {
    setErrorEstado(null);
    setExitoEstado(null);
    setActualizandoEstado(true);

    try {
      const res = await apiFetch(`/incidentes/${incidente.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        const datosActualizados: Incidente = await res.json();
        setIncidente(datosActualizados);
        setExitoEstado(`Estado cambiado a "${ETIQUETAS_ESTADO[nuevoEstado]}".`);
        onEstadoActualizado?.(datosActualizados);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorEstado(mensajeDeError(err.detail, 'No se pudo actualizar el estado del incidente.'));
      }
    } catch {
      setErrorEstado('Error de conexión con el servidor.');
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleCerrarConAccion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAccion(null);
    setErrorEstado(null);
    setExitoEstado(null);

    const limpia = accionCorrectiva.trim();
    if (!limpia) {
      setErrorAccion('La descripción de la acción correctiva es obligatoria.');
      return;
    }
    if (limpia.length > ACCION_CORRECTIVA_MAX) {
      setErrorAccion(`La acción correctiva no puede superar los ${ACCION_CORRECTIVA_MAX} caracteres.`);
      return;
    }

    setActualizandoEstado(true);
    try {
      const res = await apiFetch(`/incidentes/${incidente.id}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion_correctiva: limpia }),
      });

      if (res.ok) {
        const data: Incidente = await res.json();
        setIncidente(data);
        setExitoEstado('¡Incidente cerrado y acción correctiva registrada correctamente!');
        setMostrandoFormCierre(false);
        setAccionCorrectiva('');
        onEstadoActualizado?.(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorAccion(mensajeDeError(err.detail, 'No se pudo cerrar el incidente.'));
      }
    } catch {
      setErrorAccion('Error de conexión con el servidor.');
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleReabrirConMotivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorReapertura(null);
    setErrorEstado(null);
    setExitoEstado(null);

    const limpia = motivoReapertura.trim();
    if (!limpia) {
      setErrorReapertura('Debe indicar un motivo para la reapertura del incidente.');
      return;
    }
    if (limpia.length > MOTIVO_REAPERTURA_MAX) {
      setErrorReapertura(`El motivo no puede superar los ${MOTIVO_REAPERTURA_MAX} caracteres.`);
      return;
    }

    setActualizandoEstado(true);
    try {
      const res = await apiFetch(`/incidentes/${incidente.id}/reabrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: limpia }),
      });

      if (res.ok) {
        const data: Incidente = await res.json();
        setIncidente(data);
        setExitoEstado('Incidente reabierto. El cambio y motivo quedaron asentados en auditoría.');
        setMostrandoFormReapertura(false);
        setMotivoReapertura('');
        onEstadoActualizado?.(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorReapertura(mensajeDeError(err.detail, 'No se pudo reabrir el incidente.'));
      }
    } catch {
      setErrorReapertura('Error de conexión con el servidor.');
    } finally {
      setActualizandoEstado(false);
    }
  };

  return (
    <>
      <div className="modal-incidente-overlay" onClick={onClose}>
        <div
          className="modal-incidente-contenido"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-incidente-header">
            <div className="modal-incidente-titulo-wrapper">
              <h2>Detalle del Incidente #{incidente.id}</h2>
              <span className={`badge-incidente ${incidente.estado}`}>
                <span className="status-dot" />
                {ETIQUETAS_ESTADO[incidente.estado] || incidente.estado}
              </span>
            </div>
            <button
              type="button"
              className="btn-cerrar"
              onClick={onClose}
              title="Cerrar ventana"
            >
              ✕
            </button>
          </div>

          <div className="modal-incidente-body">
            <div className="incidente-grid-datos">
              <div className="incidente-dato-item">
                <span className="incidente-dato-label">Fecha de Reporte</span>
                <span className="incidente-dato-valor">
                  {formatearFecha(incidente.creado_el)}
                </span>
              </div>

              <div className="incidente-dato-item">
                <span className="incidente-dato-label">Reportado Por</span>
                <span className="incidente-dato-valor">
                  {incidente.nombre_reportante || 'Operador anónimo'} (Legajo #{incidente.reportado_por_id ?? '-'})
                </span>
              </div>

              <div className="incidente-dato-item">
                <span className="incidente-dato-label">Condición Actual</span>
                <span className="incidente-dato-valor" style={{ color: esAbierto ? '#b45309' : '#15803d' }}>
                  {esAbierto ? '● Caso Abierto' : '✓ Caso Cerrado'}
                </span>
              </div>
            </div>

            {/* Visualización de Acción Correctiva Registrada (HDU #39) */}
            {incidente.accion_correctiva && (
              <div className="bloque-accion-correctiva">
                <div className="bloque-accion-titulo">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                  Acción Correctiva Registrada
                </div>
                <div className="bloque-accion-cuerpo">
                  {incidente.accion_correctiva}
                </div>
                <div className="bloque-accion-meta">
                  {incidente.cerrado_el && (
                    <span>Cerrado el {formatearFecha(incidente.cerrado_el)}</span>
                  )}
                  {incidente.nombre_resolutor && (
                    <span>• Resuelto por {incidente.nombre_resolutor} (Legajo #{incidente.resuelto_por_id ?? '-'})</span>
                  )}
                </div>
                {incidente.motivo_reapertura && (
                  <div className="bloque-accion-reapertura-nota">
                    <strong>Último motivo de reapertura:</strong> {incidente.motivo_reapertura}
                  </div>
                )}
              </div>
            )}

            {/* Panel de Gestión para Administradores (HDU #37 / HDU #39) */}
            {esAdministrador && (
              <div className="incidente-acciones-estado">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="incidente-seccion-titulo" style={{ margin: 0 }}>
                    Acciones de Gestión y Resolución
                  </div>
                  {actualizandoEstado && (
                    <span style={{ fontSize: '12px', color: 'var(--inc-text-muted)' }}>
                      Actualizando...
                    </span>
                  )}
                </div>

                {errorEstado && <div className="alerta-error">{errorEstado}</div>}
                {exitoEstado && <div className="alerta-exito">{exitoEstado}</div>}

                {/* Formulario de Cierre con Acción Correctiva */}
                {mostrandoFormCierre ? (
                  <form onSubmit={handleCerrarConAccion} className="form-accion-correctiva">
                    <div style={{ fontWeight: 600, color: '#15803d', fontSize: '13.5px' }}>
                      Registrar Acción Correctiva y Cerrar Incidente
                    </div>
                    <p style={{ margin: '4px 0 8px', fontSize: '12.5px', color: 'var(--inc-text-muted)', lineHeight: 1.4 }}>
                      Describa con precisión la solución implementada (reparaciones, ajustes, reemplazos) para dejar evidencia y cerrar el caso.
                    </p>
                    {errorAccion && <div className="campo-error" style={{ marginBottom: '6px' }}>{errorAccion}</div>}
                    <textarea
                      className="incidente-textarea"
                      rows={3}
                      placeholder="Ej. Se reparó la tubería con recambio de sellos y se constató estanqueidad sin fugas..."
                      value={accionCorrectiva}
                      onChange={(e) => setAccionCorrectiva(e.target.value)}
                      disabled={actualizandoEstado}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: accionCorrectiva.trim().length > ACCION_CORRECTIVA_MAX ? '#dc2626' : '#64748b' }}>
                        {accionCorrectiva.trim().length} / {ACCION_CORRECTIVA_MAX} caracteres
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-accion-estado descartar"
                          onClick={() => {
                            setMostrandoFormCierre(false);
                            setErrorAccion(null);
                          }}
                          disabled={actualizandoEstado}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn-accion-estado resolver"
                          disabled={actualizandoEstado || !accionCorrectiva.trim()}
                        >
                          {actualizandoEstado ? 'Cerrando...' : '✓ Confirmar Cierre'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : mostrandoFormReapertura ? (
                  /* Formulario de Reapertura con Motivo Obligatorio */
                  <form onSubmit={handleReabrirConMotivo} className="form-reapertura">
                    <div style={{ fontWeight: 600, color: '#c2410c', fontSize: '13.5px' }}>
                      Reapertura del Incidente
                    </div>
                    <p style={{ margin: '4px 0 8px', fontSize: '12.5px', color: 'var(--inc-text-muted)', lineHeight: 1.4 }}>
                      Por trazabilidad y seguridad, debe ingresar el motivo por el cual se reabre este incidente.
                    </p>
                    {errorReapertura && <div className="campo-error" style={{ marginBottom: '6px' }}>{errorReapertura}</div>}
                    <textarea
                      className="incidente-textarea"
                      rows={2}
                      placeholder="Ej. Se detectó nuevamente pérdida en el mismo sector tras 24 hs de prueba..."
                      value={motivoReapertura}
                      onChange={(e) => setMotivoReapertura(e.target.value)}
                      disabled={actualizandoEstado}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: motivoReapertura.trim().length > MOTIVO_REAPERTURA_MAX ? '#dc2626' : '#64748b' }}>
                        {motivoReapertura.trim().length} / {MOTIVO_REAPERTURA_MAX} caracteres
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-accion-estado descartar"
                          onClick={() => {
                            setMostrandoFormReapertura(false);
                            setErrorReapertura(null);
                          }}
                          disabled={actualizandoEstado}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn-accion-estado reabrir"
                          disabled={actualizandoEstado || !motivoReapertura.trim()}
                        >
                          {actualizandoEstado ? 'Reabriendo...' : 'Confirmar Reapertura'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Botones principales de acción */
                  <div className="incidente-botones-estado">
                    {esAbierto ? (
                      <>
                        <button
                          type="button"
                          className="btn-accion-estado resolver"
                          disabled={actualizandoEstado}
                          onClick={() => setMostrandoFormCierre(true)}
                          title="Ingresar acción correctiva y marcar el incidente como cerrado"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                          Cerrar Incidente (Acción Correctiva)
                        </button>

                        {incidente.estado !== 'en_revision' && (
                          <button
                            type="button"
                            className="btn-accion-estado revision"
                            disabled={actualizandoEstado}
                            onClick={() => cambiarEstado('en_revision')}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                              <path d="M16 21h5v-5" />
                            </svg>
                            Pasar a "En Revisión"
                          </button>
                        )}

                        {incidente.estado !== 'descartado' && (
                          <button
                            type="button"
                            className="btn-accion-estado descartar"
                            disabled={actualizandoEstado}
                            onClick={() => cambiarEstado('descartado')}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="m4.9 4.9 14.2 14.2" />
                            </svg>
                            Descartar
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-accion-estado reabrir"
                        disabled={actualizandoEstado}
                        onClick={() => setMostrandoFormReapertura(true)}
                        title="Reabrir este incidente indicando un motivo justificado"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                        Reabrir Incidente
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="incidente-seccion-titulo">Descripción Completa del Reporte</div>
              <div className="incidente-descripcion-completa">
                {incidente.descripcion}
              </div>
            </div>

            <div className="incidente-foto-container">
              <div className="incidente-seccion-titulo">Evidencia Fotográfica Adjunta</div>
              {incidente.foto_url ? (
                <div className="incidente-foto-wrapper">
                  {cargandoFoto && (
                    <div style={{ color: 'var(--inc-text-muted)', padding: '2rem' }}>
                      Cargando fotografía adjunta...
                    </div>
                  )}
                  {errorFoto && (
                    <div style={{ color: '#dc2626', padding: '1rem', fontSize: '13px' }}>
                      {errorFoto}
                    </div>
                  )}
                  {fotoUrl && !cargandoFoto && (
                    <>
                      <img
                        src={fotoUrl}
                        alt={`Evidencia del incidente #${incidente.id}`}
                        className="incidente-foto-img"
                        title="Haga clic para ampliar en pantalla completa"
                        onClick={() => setZoomFoto(true)}
                      />
                      <span className="incidente-foto-hint">
                        🔍 Clic sobre la imagen para ver en tamaño completo
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="incidente-sin-foto">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" x2="22" y1="2" y2="22" />
                    <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
                    <line x1="13.5" x2="6" y1="13.5" y2="21" />
                    <line x1="18" x2="21" y1="12" y2="15" />
                    <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
                    <path d="M21 15V5a2 2 0 0 0-2-2H9" />
                  </svg>
                  No se adjuntó evidencia fotográfica para este incidente.
                </div>
              )}
            </div>
          </div>

          <div className="modal-incidente-footer">
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {zoomFoto && fotoUrl && (
        <div
          className="modal-foto-zoom-overlay"
          onClick={() => setZoomFoto(false)}
        >
          <img
            src={fotoUrl}
            alt={`Ampliación de evidencia de incidente #${incidente.id}`}
            className="modal-foto-zoom-img"
          />
        </div>
      )}
    </>
  );
};
