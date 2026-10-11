import React, { useEffect, useState } from 'react';
import type { Incidente, IncidenteAbierto, IncidentesMetricas, NivelUrgencia } from './tipos';
import {
  ETIQUETAS_ESTADO,
  formatearAntiguedad,
  formatearFecha,
} from './tipos';
import { DetalleIncidenteModal } from './detalleModal';
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
    return (
      <span className="evidencia-sin-foto-pill" title="Sin foto adjunta (clic para ver detalle)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
          <line x1="13.5" y1="6" x2="13.5" y2="6.01" />
          <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
          <path d="M21 15V5a2 2 0 0 0-2-2H9" />
        </svg>
        Sin foto
      </span>
    );
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

export interface IncidentesAbiertosProps {
  onVerHistorialCompleto?: () => void;
}

export const IncidentesAbiertos: React.FC<IncidentesAbiertosProps> = ({
  onVerHistorialCompleto,
}) => {
  const [incidentes, setIncidentes] = useState<IncidenteAbierto[]>([]);
  const [metricas, setMetricas] = useState<IncidentesMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'TODOS' | NivelUrgencia>('TODOS');

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [abrirConCierre, setAbrirConCierre] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resAbiertos, resMetricas] = await Promise.all([
        apiFetch('/incidentes/abiertos'),
        apiFetch('/incidentes/abiertos/metricas'),
      ]);

      if (resAbiertos.ok) {
        const dataAbiertos: IncidenteAbierto[] = await resAbiertos.json();
        setIncidentes(dataAbiertos);
      } else {
        setError('No se pudo obtener el listado de incidentes abiertos.');
      }

      if (resMetricas.ok) {
        const dataMetricas: IncidentesMetricas = await resMetricas.json();
        setMetricas(dataMetricas);
      }
    } catch {
      setError('Error de conexión al cargar los incidentes abiertos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroUrgencia, filasPorPagina]);

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

    const coincideUrgencia =
      filtroUrgencia === 'TODOS' || inc.nivel_urgencia === filtroUrgencia;

    return coincideBusqueda && coincideUrgencia;
  });

  const totalIncidentes = incidentesFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalIncidentes / filasPorPagina));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
  const indiceInicio = (paginaValida - 1) * filasPorPagina;
  const indiceFin = Math.min(indiceInicio + filasPorPagina, totalIncidentes);
  const incidentesPaginados = incidentesFiltrados.slice(indiceInicio, indiceFin);

  const obtenerPaginasVisibles = (actual: number, total: number): number[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (actual <= 3) return [1, 2, 3, 4, 5];
    if (actual >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [actual - 2, actual - 1, actual, actual + 1, actual + 2];
  };

  const handleEstadoActualizado = (incidenteActualizado: Incidente) => {
    const esCerrado =
      incidenteActualizado.estado === 'cerrado' ||
      incidenteActualizado.estado === 'resuelto' ||
      incidenteActualizado.estado === 'descartado' ||
      Boolean(incidenteActualizado.accion_correctiva);

    if (esCerrado) {
      setIncidentes((prev) => prev.filter((i) => i.id !== incidenteActualizado.id));
      apiFetch('/incidentes/abiertos/metricas')
        .then(async (res) => {
          if (res.ok) setMetricas(await res.json());
        })
        .catch(() => {});
    } else {
      setIncidentes((prev) =>
        prev.map((i) => (i.id === incidenteActualizado.id ? { ...i, ...incidenteActualizado } : i))
      );
    }
  };

  const abrirParaResolver = (inc: Incidente, e: React.MouseEvent) => {
    e.stopPropagation();
    setAbrirConCierre(true);
    setIncidenteSeleccionado(inc);
  };

  const abrirDetalle = (inc: Incidente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAbrirConCierre(false);
    setIncidenteSeleccionado(inc);
  };

  return (
    <div className="modulo-container modulo-incidentes-container">
      <div className="listado-top-bar" style={{ alignItems: 'flex-start' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Incidentes Pendientes y Abiertos</h1>
          <div className="subtitulo">
            01 · Supervisión prioritaria de casos sin resolver · Ordenados por antigüedad (más antiguos primero)
          </div>
        </div>

        {onVerHistorialCompleto && (
          <div className="tabs-incidentes-header">
            <button type="button" className="tab-incidente-btn activo">
              <span className="status-dot" style={{ backgroundColor: '#dc2626' }} />
              Abiertos
              <span className="badge-tab-contador abiertos">{incidentes.length}</span>
            </button>
            <button
              type="button"
              className="tab-incidente-btn"
              onClick={onVerHistorialCompleto}
            >
              Historial Completo
            </button>
          </div>
        )}
      </div>

      <div className="tablero-metricas-grid">
        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono total">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor">{metricas ? metricas.total_abiertos : incidentes.length}</span>
            <span className="tarjeta-metrica-label">Total Abiertos</span>
          </div>
        </div>

        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono critico">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor" style={{ color: '#dc2626' }}>
              {metricas?.por_antiguedad.mas_72h ?? incidentes.filter((i) => i.nivel_urgencia === 'CRITICO').length}
            </span>
            <span className="tarjeta-metrica-label">Críticos (&gt; 72 h)</span>
          </div>
        </div>

        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono atencion">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor" style={{ color: '#d97706' }}>
              {metricas?.por_antiguedad.entre_24h_y_72h ?? incidentes.filter((i) => i.nivel_urgencia === 'ATENCION').length}
            </span>
            <span className="tarjeta-metrica-label">En Atención (24h - 72h)</span>
          </div>
        </div>

        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono reciente">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor" style={{ color: '#16a34a' }}>
              {metricas?.por_antiguedad.menos_24h ?? incidentes.filter((i) => i.nivel_urgencia === 'RECIENTE').length}
            </span>
            <span className="tarjeta-metrica-label">Recientes (&lt; 24 h)</span>
          </div>
        </div>
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
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>

        <div className="filtros-segmentados">
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroUrgencia === 'TODOS' ? 'activo' : ''}`}
            onClick={() => setFiltroUrgencia('TODOS')}
          >
            Todos
            <span className="badge-conteo">{incidentes.length}</span>
          </button>
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroUrgencia === 'CRITICO' ? 'activo' : ''}`}
            onClick={() => setFiltroUrgencia('CRITICO')}
          >
            <span className="status-dot" style={{ backgroundColor: '#dc2626' }} />
            Críticos (&gt; 72h)
            <span className="badge-conteo">{incidentes.filter((i) => i.nivel_urgencia === 'CRITICO').length}</span>
          </button>
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroUrgencia === 'ATENCION' ? 'activo' : ''}`}
            onClick={() => setFiltroUrgencia('ATENCION')}
          >
            <span className="status-dot" style={{ backgroundColor: '#f59e0b' }} />
            En Atención
            <span className="badge-conteo">{incidentes.filter((i) => i.nivel_urgencia === 'ATENCION').length}</span>
          </button>
          <button
            type="button"
            className={`filtro-segmento-btn ${filtroUrgencia === 'RECIENTE' ? 'activo' : ''}`}
            onClick={() => setFiltroUrgencia('RECIENTE')}
          >
            <span className="status-dot" style={{ backgroundColor: '#22c55e' }} />
            Recientes
            <span className="badge-conteo">{incidentes.filter((i) => i.nivel_urgencia === 'RECIENTE').length}</span>
          </button>
        </div>
      </div>

      <div className="tabla-wrapper-incidentes" style={{ borderRadius: totalIncidentes > 0 ? '12px 12px 0 0' : '12px' }}>
        <table className="tabla-custom-incidentes">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Antigüedad</th>
              <th style={{ width: '11%' }}>Fecha</th>
              <th style={{ width: '16%' }}>Reportado Por</th>
              <th style={{ width: '31%' }}>Descripción</th>
              <th style={{ width: '9%', textAlign: 'center' }}>Evidencia</th>
              <th style={{ width: '9%', textAlign: 'center' }}>Estado</th>
              <th className="acciones-col" style={{ width: '11%', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Cargando incidentes abiertos...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#dc2626' }}>
                  {error}
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn-guardar"
                      style={{ padding: '0.4rem 1rem', fontSize: '13px' }}
                      onClick={cargarDatos}
                    >
                      Reintentar
                    </button>
                  </div>
                </td>
              </tr>
            ) : incidentesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  {busqueda || filtroUrgencia !== 'TODOS'
                    ? 'No se encontraron incidentes abiertos que coincidan con los filtros aplicados.'
                    : '🎉 ¡Excelente! No hay incidentes pendientes ni abiertos en este momento.'}
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
                    onClick={() => abrirDetalle(inc)}
                    title="Clic para ver detalle completo del incidente"
                  >
                    <td>
                      <span
                        className={`badge-urgencia ${
                          inc.nivel_urgencia === 'CRITICO'
                            ? 'critico'
                            : inc.nivel_urgencia === 'ATENCION'
                            ? 'atencion'
                            : 'reciente'
                        }`}
                        title={`Abierto hace ${formatearAntiguedad(inc.horas_abierto)}`}
                      >
                        <span className="status-dot" />
                        {inc.nivel_urgencia === 'CRITICO' ? '⚠️ ' : ''}
                        {formatearAntiguedad(inc.horas_abierto)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                        {dia}
                      </div>
                      {hora && (
                        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', marginTop: '2px' }}>
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
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
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
                          onClick={() => abrirDetalle(inc)}
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
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-resolver-fila"
                          title="Registrar acción correctiva y cerrar este incidente"
                          onClick={(e) => abrirParaResolver(inc, e)}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Resolver
                        </button>
                        <button
                          type="button"
                          className="btn-ver-detalle-tabla btn-ver-compacto"
                          title="Ver detalles completos del incidente"
                          onClick={(e) => abrirDetalle(inc, e)}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalIncidentes > 0 && (
        <div className="paginacion-container">
          <div className="paginacion-info-wrapper">
            <span className="paginacion-info-texto">
              Mostrando <strong>{indiceInicio + 1}</strong> - <strong>{indiceFin}</strong> de <strong>{totalIncidentes}</strong> incidentes abiertos
            </span>
            <div className="paginacion-selector-filas">
              <label htmlFor="select-filas-abiertos" style={{ color: 'var(--inc-text-muted)' }}>
                Filas por página:
              </label>
              <select
                id="select-filas-abiertos"
                className="select-filas-por-pagina"
                value={filasPorPagina}
                onChange={(e) => setFilasPorPagina(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="paginacion-controles">
            <button
              type="button"
              className="btn-paginacion"
              onClick={() => setPaginaActual(1)}
              disabled={paginaValida <= 1}
              title="Primera página"
            >
              «
            </button>
            <button
              type="button"
              className="btn-paginacion"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaValida <= 1}
              title="Página anterior"
            >
              ‹ Anterior
            </button>

            {obtenerPaginasVisibles(paginaValida, totalPaginas).map((numPagina) => (
              <button
                key={numPagina}
                type="button"
                className={`btn-paginacion-numero ${numPagina === paginaValida ? 'activo' : ''}`}
                onClick={() => setPaginaActual(numPagina)}
              >
                {numPagina}
              </button>
            ))}

            <button
              type="button"
              className="btn-paginacion"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaValida >= totalPaginas}
              title="Página siguiente"
            >
              Siguiente ›
            </button>
            <button
              type="button"
              className="btn-paginacion"
              onClick={() => setPaginaActual(totalPaginas)}
              disabled={paginaValida >= totalPaginas}
              title="Última página"
            >
              »
            </button>
          </div>
        </div>
      )}

      {incidenteSeleccionado && (
        <DetalleIncidenteModal
          key={`${incidenteSeleccionado.id}-${abrirConCierre}`}
          incidente={incidenteSeleccionado}
          iniciarConCierreDirecto={abrirConCierre}
          onClose={() => {
            setIncidenteSeleccionado(null);
            setAbrirConCierre(false);
          }}
          onEstadoActualizado={handleEstadoActualizado}
        />
      )}
    </div>
  );
};

