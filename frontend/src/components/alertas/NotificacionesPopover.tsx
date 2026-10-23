import React, { useEffect, useRef, useState } from 'react';
import { useNotificaciones, type NotificacionItem } from '../../hooks/useNotificaciones';

interface NotificacionesPopoverProps {
  onNavegar?: (notificacion: NotificacionItem) => void;
  onIrAIncidentes?: () => void;
  onIrAVencimientos?: () => void;
}

interface ConfiguracionIcono {
  icono: string;
  color: string;
  fondo: string;
}

const CONFIGURACION_ICONO: Record<string, ConfiguracionIcono> = {
  incidente_critico: {
    icono: 'report_problem',
    color: 'var(--color-error, #dc2626)',
    fondo: 'rgba(220, 38, 38, 0.12)',
  },
  evento_incidente: {
    icono: 'warning',
    color: '#d97706',
    fondo: 'rgba(217, 119, 6, 0.12)',
  },
  vencimiento_personal: {
    icono: 'badge',
    color: 'var(--color-primario, #2563eb)',
    fondo: 'rgba(37, 99, 235, 0.12)',
  },
  vencimiento_equipo: {
    icono: 'build',
    color: '#0284c7',
    fondo: 'rgba(2, 132, 199, 0.12)',
  },
  vencimiento_documento: {
    icono: 'description',
    color: '#6366f1',
    fondo: 'rgba(99, 102, 241, 0.12)',
  },
  vencimiento_elemento_limpieza: {
    icono: 'cleaning_services',
    color: '#0d9488',
    fondo: 'rgba(13, 148, 136, 0.12)',
  },
  vencimiento_plagas_agua: {
    icono: 'water_drop',
    color: '#0284c7',
    fondo: 'rgba(2, 132, 199, 0.12)',
  },
  evento_tarea_revision: {
    icono: 'pending_actions',
    color: '#d97706',
    fondo: 'rgba(217, 119, 6, 0.12)',
  },
  evento_tarea_reasignada: {
    icono: 'assignment_ind',
    color: '#2563eb',
    fondo: 'rgba(37, 99, 235, 0.12)',
  },
  evento_stock_quimico: {
    icono: 'science',
    color: '#ea580c',
    fondo: 'rgba(234, 88, 12, 0.12)',
  },
  general: {
    icono: 'notifications',
    color: 'var(--color-texto-sec, #64748b)',
    fondo: 'rgba(100, 116, 139, 0.12)',
  },
};

const formatearFechaHora = (fechaIso: string): string => {
  try {
    const d = new Date(fechaIso);
    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  } catch {
    return fechaIso;
  }
};

export const NotificacionesPopover: React.FC<NotificacionesPopoverProps> = ({
  onNavegar,
  onIrAIncidentes,
  onIrAVencimientos,
}) => {
  const {
    notificaciones,
    totalNoLeidas,
    cargando,
    refrescar,
    marcarComoLeida,
    marcarTodasComoLeidas,
  } = useNotificaciones();

  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas'>('todas');
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto]);

  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (filtro === 'no_leidas') return !n.leida;
    return true;
  });

  const handleSeleccionarNotificacion = async (notif: NotificacionItem) => {
    if (!notif.leida) {
      await marcarComoLeida(notif.id);
    }
    setAbierto(false);

    if (onNavegar) {
      onNavegar(notif);
    } else if (notif.tipo.startsWith('vencimiento_') && onIrAVencimientos) {
      onIrAVencimientos();
    } else if ((notif.tipo.includes('revision') || notif.tipo.includes('incidente')) && onIrAIncidentes) {
      onIrAIncidentes();
    }
  };

  return (
    <div ref={contenedorRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className={`saia-campana-btn ${abierto ? 'abierto' : ''} ${totalNoLeidas > 0 ? 'tiene-criticas' : ''}`}
        aria-label={`Notificaciones (${totalNoLeidas} no leídas)`}
        aria-expanded={abierto}
        title="Centro de Notificaciones"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px', lineHeight: 1 }}>
          notifications
        </span>

        {totalNoLeidas > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontWeight: 700,
              backgroundColor: 'var(--color-error)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--color-superficie), 0 0 8px rgba(239, 68, 68, 0.4)',
            }}
          >
            {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="saia-alertas-popover">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-borde)',
              backgroundColor: 'var(--color-superficie)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)' }}>
                Notificaciones
              </span>
              {totalNoLeidas > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-error-bg)',
                    color: 'var(--color-error-texto)',
                    border: '1px solid var(--color-error)',
                  }}
                >
                  {totalNoLeidas} {totalNoLeidas === 1 ? 'nueva' : 'nuevas'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {totalNoLeidas > 0 && (
                <button
                  type="button"
                  onClick={() => marcarTodasComoLeidas()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primario)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Marcar todas como leídas"
                >
                  Marcar leídas
                </button>
              )}

              <button
                type="button"
                onClick={() => refrescar()}
                disabled={cargando}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-texto-sec)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Actualizar notificaciones"
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    animation: cargando ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  refresh
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-texto-sec)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Cerrar panel"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '6px 12px',
              borderBottom: '1px solid var(--color-borde)',
              backgroundColor: 'var(--color-fondo)',
            }}
          >
            <button
              type="button"
              onClick={() => setFiltro('todas')}
              className={`filtro-segmento-btn ${filtro === 'todas' ? 'activo' : ''}`}
              style={{ flex: 1, padding: '4px 6px', fontSize: '11.5px', borderRadius: '6px' }}
            >
              Todas ({notificaciones.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('no_leidas')}
              className={`filtro-segmento-btn ${filtro === 'no_leidas' ? 'activo' : ''}`}
              style={{ flex: 1, padding: '4px 6px', fontSize: '11.5px', borderRadius: '6px' }}
            >
              No leídas ({totalNoLeidas})
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              padding: '4px 0',
            }}
          >
            {cargando && notificaciones.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  color: 'var(--color-texto-sec)',
                  fontSize: '13px',
                }}
              >
                Cargando notificaciones...
              </div>
            ) : notificacionesFiltradas.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  color: 'var(--color-texto-sec)',
                }}
              >
                <div style={{ margin: '0 auto 8px', color: 'var(--color-texto-sec)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                    notifications_off
                  </span>
                </div>
                <strong style={{ display: 'block', color: 'var(--text-h)', fontSize: '13px', marginBottom: '4px' }}>
                  Sin notificaciones
                </strong>
                <span style={{ fontSize: '12px' }}>
                  {filtro === 'no_leidas'
                    ? 'No tienes notificaciones pendientes de lectura.'
                    : 'No hay notificaciones registradas.'}
                </span>
              </div>
            ) : (
              notificacionesFiltradas.map((notif) => {
                const conf = CONFIGURACION_ICONO[notif.tipo] || CONFIGURACION_ICONO.general;
                const esNoLeida = !notif.leida;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleSeleccionarNotificacion(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-borde)',
                      backgroundColor: esNoLeida
                        ? 'color-mix(in srgb, var(--color-primario) 6%, var(--color-superficie))'
                        : 'transparent',
                      borderLeft: esNoLeida ? '3px solid var(--color-primario)' : '3px solid transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: conf.fondo,
                        color: conf.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {conf.icono}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          marginBottom: '2px',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '12.5px',
                            color: esNoLeida ? 'var(--text-h)' : 'var(--color-texto)',
                            fontWeight: esNoLeida ? 700 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {notif.titulo}
                        </strong>

                        <span
                          style={{
                            fontSize: '10.5px',
                            color: 'var(--color-texto-sec)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatearFechaHora(notif.fecha)}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          lineHeight: 1.35,
                          color: esNoLeida ? 'var(--color-texto)' : 'var(--color-texto-sec)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {notif.mensaje}
                      </p>
                    </div>

                    {esNoLeida && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--color-primario)',
                          flexShrink: 0,
                          marginTop: '6px',
                        }}
                        title="No leída"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-fondo)',
              borderTop: '1px solid var(--color-borde)',
              fontSize: '11px',
              color: 'var(--color-texto-sec)',
              textAlign: 'center',
            }}
          >
            Notificaciones automáticas del sistema
          </div>
        </div>
      )}
    </div>
  );
};
