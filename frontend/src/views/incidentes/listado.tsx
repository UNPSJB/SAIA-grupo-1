import React, { useEffect, useState } from 'react';
import type { FiltroEstadoGrupo, Incidente } from './tipos';
import {
  ETIQUETAS_ESTADO,
  esIncidenteAbierto,
  esIncidenteCerrado,
  formatearFecha,
} from './tipos';
import { DetalleIncidenteModal } from './detalleModal';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import { apiFetch } from '../../api/client';
import '../../styles/formularioAlta.css';
import '../../styles/incidentes.css';

interface FotoMiniaturaProps {
  incidenteId: number;
  descripcion: string;
  onClick: () => void;
}

const FotoMiniatura: React.FC<FotoMiniaturaProps> = ({ incidenteId, descripcion, onClick }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    let objUrl: string | null = null;

    apiFetch(`/incidentes/${incidenteId}/foto`)
      .then(async (res) => {
        if (!activo) return;
        if (res.ok) {
          const blob = await res.blob();
          if (activo) {
            objUrl = URL.createObjectURL(blob);
            setUrl(objUrl);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
      if (objUrl) {
        URL.revokeObjectURL(objUrl);
      }
    };
  }, [incidenteId]);

  if (cargando) {
    return (
      <div className="foto-miniatura-cargando" title="Cargando imagen...">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  if (!url) {
    return <span style={{ color: 'var(--color-borde)' }}>—</span>;
  }

  return (
    <img
      src={url}
      alt={`Evidencia de: ${descripcion}`}
      className="foto-miniatura-tabla"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Clic para ver detalle y foto ampliada"
    />
  );
};

export interface ListadoIncidentesProps {
  onVerAbiertos?: () => void;
}

export const ListadoIncidentes: React.FC<ListadoIncidentesProps> = ({ onVerAbiertos }) => {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoGrupo>('TODOS');
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);

  useEffect(() => {
    let cancelado = false;

    apiFetch('/incidentes/')
      .then(async (res) => {
        if (cancelado) return;
        if (res.ok) {
          const data: Incidente[] = await res.json();
          setIncidentes(data);
        } else {
          setError('No se pudo obtener la lista de incidentes.');
        }
      })
      .catch(() => {
        if (!cancelado) {
          setError('Error de conexión con el servidor al cargar los incidentes.');
        }
      })
      .finally(() => {
        if (!cancelado) {
          setLoading(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const reintentarCarga = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/incidentes/');
      if (res.ok) {
        const data: Incidente[] = await res.json();
        setIncidentes(data);
      } else {
        setError('No se pudo obtener la lista de incidentes.');
      }
    } catch {
      setError('Error de conexión con el servidor al cargar los incidentes.');
    } finally {
      setLoading(false);
    }
  };

  const totalAbiertos = incidentes.filter((i) => esIncidenteAbierto(i.estado)).length;
  const totalCerrados = incidentes.filter((i) => esIncidenteCerrado(i.estado)).length;

  const incidentesFiltrados = incidentes.filter((inc) => {
    const termino = busqueda.toLowerCase().trim();
    const desc = (inc.descripcion || '').toLowerCase();
    const rep = (inc.nombre_reportante || '').toLowerCase();
    const legajo = (inc.reportado_por_id ?? '').toString();

    const coincideBusqueda =
      !termino ||
      desc.includes(termino) ||
      rep.includes(termino) ||
      legajo.includes(termino);

    let coincideEstado = true;
    if (filtroEstado === 'ABIERTOS') {
      coincideEstado = esIncidenteAbierto(inc.estado);
    } else if (filtroEstado === 'CERRADOS') {
      coincideEstado = esIncidenteCerrado(inc.estado);
    }

    return coincideBusqueda && coincideEstado;
  });

  const {
    itemsPaginados: incidentesPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros: totalIncidentes,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(incidentesFiltrados);

  const handleEstadoActualizado = (incidenteActualizado: Incidente) => {
    setIncidentes((prev) =>
      prev.map((i) => (i.id === incidenteActualizado.id ? incidenteActualizado : i))
    );
  };

  return (
    <div className="modulo-container modulo-incidentes-container">
      <div className="listado-top-bar" style={{ alignItems: 'flex-start' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Listado de Incidentes</h1>
          <div className="subtitulo">01 · Supervisión y gestión de incidentes reportados en planta</div>
        </div>

        {onVerAbiertos && (
          <div className="tabs-incidentes-header">
            <button
              type="button"
              className="tab-incidente-btn"
              onClick={onVerAbiertos}
            >
              <span className="status-dot" style={{ backgroundColor: 'var(--color-error)' }} />
              Abiertos
              <span className="badge-tab-contador abiertos">{totalAbiertos}</span>
            </button>
            <button type="button" className="tab-incidente-btn activo">
              Historial Completo
            </button>
          </div>
        )}
      </div>

      <div className="filtros-top-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
          <input
            type="text"
            placeholder="Buscar por descripción, reportante o legajo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-busqueda"
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.4rem' }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-sec)', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>

        <div className="filtros-segmentados">
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroEstado === 'TODOS' ? 'activo' : ''}`}
            onClick={() => setFiltroEstado('TODOS')}
          >
            Todos
            <span className="badge-conteo">{incidentes.length}</span>
          </button>
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroEstado === 'ABIERTOS' ? 'activo' : ''}`}
            onClick={() => setFiltroEstado('ABIERTOS')}
          >
            <span className="status-dot" style={{ backgroundColor: 'var(--color-alerta)' }} />
            Abiertos
            <span className="badge-conteo">{totalAbiertos}</span>
          </button>
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroEstado === 'CERRADOS' ? 'activo' : ''}`}
            onClick={() => setFiltroEstado('CERRADOS')}
          >
            <span className="status-dot" style={{ backgroundColor: 'var(--color-exito)' }} />
            Cerrados
            <span className="badge-conteo">{totalCerrados}</span>
          </button>
        </div>
      </div>

      <div className="tabla-wrapper-incidentes" style={{ borderRadius: totalIncidentes > 0 ? '12px 12px 0 0' : '12px' }}>
        <table className="tabla-custom-incidentes">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Fecha</th>
              <th style={{ width: '18%' }}>Reportado Por</th>
              <th style={{ width: '37%' }}>Descripción</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Evidencia</th>
              <th style={{ width: '11%', textAlign: 'center' }}>Estado</th>
              <th className="acciones-col" style={{ width: '11%', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Cargando incidentes...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-error-texto)' }}>
                  {error}
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn-guardar"
                      style={{ padding: '0.4rem 1rem', fontSize: '13px' }}
                      onClick={reintentarCarga}
                    >
                      Reintentar
                    </button>
                  </div>
                </td>
              </tr>
            ) : incidentesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  {busqueda || filtroEstado !== 'TODOS'
                    ? 'No se encontraron incidentes que coincidan con los filtros aplicados.'
                    : 'No hay incidentes registrados en el sistema.'}
                </td>
              </tr>
            ) : (
              incidentesPaginados.map((inc) => {
                const f = formatearFecha(inc.creado_el);
                const partes = f.includes(',') ? f.split(',') : [f, ''];
                const dia = partes[0].trim();
                const hora = partes[1]?.trim();

                return (
                  <tr
                    key={inc.id}
                    className="fila-incidente-clickeable"
                    onClick={() => setIncidenteSeleccionado(inc)}
                    title="Clic para ver detalle completo del incidente"
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                        {dia}
                      </div>
                      {hora && (
                        <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {hora} hs
                        </div>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-h)',
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={inc.nombre_reportante || 'Operador anónimo'}
                      >
                        {inc.nombre_reportante || 'Operador anónimo'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '2px' }}>
                        Legajo #{inc.reportado_por_id ?? '-'}
                      </div>
                    </td>
                    <td>
                      <div
                        title={inc.descripcion}
                        style={{
                          color: 'var(--text-h)',
                          fontSize: '13px',
                          lineHeight: '1.45',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {inc.descripcion}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {inc.foto_url ? (
                        <FotoMiniatura
                          incidenteId={inc.id}
                          descripcion={inc.descripcion}
                          onClick={() => setIncidenteSeleccionado(inc)}
                        />
                      ) : (
                        <span className="evidencia-sin-foto-pill" title="Sin foto adjunta (clic para ver detalle)">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="2" y1="2" x2="22" y2="22" />
                            <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
                            <line x1="13.5" y1="6" x2="13.5" y2="6.01" />
                            <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
                            <path d="M21 15V5a2 2 0 0 0-2-2H9" />
                          </svg>
                          Sin foto
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-incidente ${inc.estado}`}>
                        <span className="status-dot" />
                        {ETIQUETAS_ESTADO[inc.estado] || inc.estado}
                      </span>
                    </td>
                    <td className="acciones-col" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-ver-detalle-tabla"
                        title="Ver detalles completos del incidente"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIncidenteSeleccionado(inc);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                        </svg>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalIncidentes}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="incidentes"
      />

      {incidenteSeleccionado && (
        <DetalleIncidenteModal
          key={incidenteSeleccionado.id}
          incidente={incidenteSeleccionado}
          onClose={() => setIncidenteSeleccionado(null)}
          onEstadoActualizado={handleEstadoActualizado}
        />
      )}
    </div>
  );
};
