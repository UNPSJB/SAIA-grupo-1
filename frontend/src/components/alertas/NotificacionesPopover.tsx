import React, { useEffect, useRef, useState } from 'react';
import { useAlertasSistema, type AlertaItem } from '../../hooks/useAlertasSistema';
import { EtiquetaCategoria } from '../../views/incidentes/tipos';

interface NotificacionesPopoverProps {
  onIrAIncidentes?: () => void;
  onIrAVencimientos?: () => void;
}

export const NotificacionesPopover: React.FC<NotificacionesPopoverProps> = ({
  onIrAIncidentes,
  onIrAVencimientos,
}) => {
  const {
    alertas,
    totalAlertas,
    totalCriticas,
    totalIncidentes,
    totalVencimientos,
    cargando,
    refrescar,
  } = useAlertasSistema();

  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'incidentes' | 'vencimientos' | 'criticas'>('todas');
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

  const alertasFiltradas = alertas.filter((a) => {
    if (filtro === 'incidentes') return a.tipo === 'incidente';
    if (filtro === 'vencimientos') return a.tipo === 'vencimiento';
    if (filtro === 'criticas') return a.severidad === 'critica';
    return true;
  });

  const handleSeleccionarAlerta = (alerta: AlertaItem) => {
    setAbierto(false);
    if (alerta.tipo === 'incidente') {
      onIrAIncidentes?.();
    } else {
      onIrAVencimientos?.();
    }
  };

  return (
    <div ref={contenedorRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className={`saia-campana-btn ${abierto ? 'abierto' : ''} ${totalCriticas > 0 ? 'tiene-criticas' : ''}`}
        aria-label={`Alertas (${totalAlertas})`}
        aria-expanded={abierto}
        title="Centro de Alertas"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {totalAlertas > 0 && (
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
              backgroundColor: totalCriticas > 0 ? 'var(--color-error)' : 'var(--color-alerta)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: totalCriticas > 0
                ? '0 0 0 2px var(--color-superficie), 0 0 8px rgba(239, 68, 68, 0.4)'
                : '0 0 0 2px var(--color-superficie)',
            }}
          >
            {totalAlertas > 99 ? '99+' : totalAlertas}
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
                Alertas
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: totalCriticas > 0 ? 'var(--color-error-bg)' : 'var(--color-fondo)',
                  color: totalCriticas > 0 ? 'var(--color-error-texto)' : 'var(--color-texto-sec)',
                  border: '1px solid var(--color-borde)',
                }}
              >
                {totalAlertas} {totalAlertas === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                title="Actualizar alertas"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: cargando ? 'spin 1s linear infinite' : 'none' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
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
                  fontSize: '13px',
                  lineHeight: 1,
                }}
                title="Cerrar panel"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '8px 12px',
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
              Todas ({totalAlertas})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('incidentes')}
              className={`filtro-segmento-btn ${filtro === 'incidentes' ? 'activo' : ''}`}
              style={{ flex: 1, padding: '4px 6px', fontSize: '11.5px', borderRadius: '6px' }}
            >
              Incidentes ({totalIncidentes})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('vencimientos')}
              className={`filtro-segmento-btn ${filtro === 'vencimientos' ? 'activo' : ''}`}
              style={{ flex: 1, padding: '4px 6px', fontSize: '11.5px', borderRadius: '6px' }}
            >
              Vencim. ({totalVencimientos})
            </button>
            {totalCriticas > 0 && (
              <button
                type="button"
                onClick={() => setFiltro('criticas')}
                className={`filtro-segmento-btn ${filtro === 'criticas' ? 'activo' : ''}`}
                style={{
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  borderRadius: '6px',
                  color: 'var(--color-error-texto)',
                }}
              >
                Críticas ({totalCriticas})
              </button>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {cargando && alertas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-texto-sec)', fontSize: '13px' }}>
                Sincronizando alertas...
              </div>
            ) : alertasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-texto-sec)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>✨</div>
                <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '13px' }}>
                  Sin alertas pendientes
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  No hay incidentes abiertos ni vencimientos en riesgo.
                </div>
              </div>
            ) : (
              alertasFiltradas.map((alerta) => {
                const esCritica = alerta.severidad === 'critica';
                const esAlta = alerta.severidad === 'alta';

                const colorBorde = esCritica
                  ? 'var(--color-error)'
                  : esAlta
                  ? 'var(--color-alerta)'
                  : 'var(--color-primario)';

                return (
                  <div
                    key={alerta.id}
                    onClick={() => handleSeleccionarAlerta(alerta)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-borde)',
                      borderLeft: `3.5px solid ${colorBorde}`,
                      backgroundColor: 'var(--color-superficie)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-fondo)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-superficie)';
                    }}
                    title="Clic para ir a resolver"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {alerta.tipo === 'incidente' ? (
                          <EtiquetaCategoria
                            nombre={alerta.categoria}
                            id={alerta.categoriaId}
                            size="sm"
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: esCritica ? 'var(--color-error-bg)' : 'var(--color-alerta-bg)',
                              color: esCritica ? 'var(--color-error-texto)' : 'var(--color-alerta-texto)',
                              border: `1px solid ${colorBorde}`,
                            }}
                          >
                            {alerta.categoria}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: esCritica ? 'var(--color-error-texto)' : 'var(--color-texto-sec)', fontWeight: 600 }}>
                          {alerta.tiempoTexto}
                        </span>
                      </div>

                      <span style={{ fontSize: '11px', color: 'var(--color-primario)', fontWeight: 600 }}>
                        Ir →
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-h)', marginTop: '2px' }}>
                      {alerta.titulo}
                    </div>

                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-texto-sec)',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {alerta.descripcion}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderTop: '1px solid var(--color-borde)',
              backgroundColor: 'var(--color-fondo)',
              fontSize: '11.5px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                onIrAIncidentes?.();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primario)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Ver incidentes abiertos ({totalIncidentes})
            </button>

            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                onIrAVencimientos?.();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primario)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Ver vencimientos ({totalVencimientos})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
