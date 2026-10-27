import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Badge } from '../../components/ui/badge';
import { DetalleIncidenteModal } from './detalleModal';
import {
  COLORES_TIPO,
  ETIQUETAS_ESTADO,
  ETIQUETAS_TIPO,
  EtiquetaCategoria,
  formatearFecha,
  type EstadisticaIncidentesPorTipo,
  type EstadisticaTipoItem,
  type Incidente,
  type TipoIncidente,
} from './tipos';
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
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [incidenteId]);

  if (cargando) {
    return (
      <div className="foto-miniatura-cargando" title="Cargando imagen...">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: 'spin 1s linear infinite' }}
        >
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

export type PeriodoPreset = 'todo' | '7dias' | '30dias' | 'anio' | 'personalizado';

export interface EstadisticasIncidentesProps {
  onVerAbiertos?: () => void;
  onVerHistorial?: () => void;
  onVerCategorias?: () => void;
  onRegistrarClick?: () => void;
}

export const EstadisticasIncidentes: React.FC<EstadisticasIncidentesProps> = ({
  onVerAbiertos,
  onVerHistorial,
  onVerCategorias,
  onRegistrarClick,
}) => {
  const { esOperador } = useAuth();

  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [estadisticas, setEstadisticas] = useState<EstadisticaIncidentesPorTipo | null>(null);
  const [cargandoStats, setCargandoStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<TipoIncidente | null>(null);
  const [detalleIncidentes, setDetalleIncidentes] = useState<Incidente[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [incidenteParaModal, setIncidenteParaModal] = useState<Incidente | null>(null);

  const calcularFechasPreset = (preset: PeriodoPreset): { d: string; h: string } => {
    const hoy = new Date();
    const formato = (fecha: Date) => fecha.toISOString().split('T')[0];

    if (preset === '7dias') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);
      return { d: formato(inicio), h: formato(hoy) };
    }
    if (preset === '30dias') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 30);
      return { d: formato(inicio), h: formato(hoy) };
    }
    if (preset === 'anio') {
      const inicio = new Date(hoy.getFullYear(), 0, 1);
      return { d: formato(inicio), h: formato(hoy) };
    }
    return { d: '', h: '' };
  };

  const cargarEstadisticas = useCallback(
    async (d?: string, h?: string) => {
      const fDesde = d !== undefined ? d : desde;
      const fHasta = h !== undefined ? h : hasta;

      if (fDesde && fHasta && fDesde > fHasta) {
        setErrorStats("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
        return;
      }

      setCargandoStats(true);
      setErrorStats(null);

      const params = new URLSearchParams();
      if (fDesde) params.append('desde', fDesde);
      if (fHasta) params.append('hasta', fHasta);

      try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/incidentes/estadisticas/por-tipo${query}`);
        if (res.ok) {
          const data: EstadisticaIncidentesPorTipo = await res.json();
          setEstadisticas(data);
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorStats(err.detail || 'No se pudieron cargar las estadísticas.');
        }
      } catch {
        setErrorStats('Error de conexión con el servidor al cargar estadísticas.');
      } finally {
        setCargandoStats(false);
      }
    },
    [desde, hasta]
  );

  const cargarDetalleCategoria = useCallback(
    async (tipo: TipoIncidente) => {
      setCargandoDetalle(true);
      setErrorDetalle(null);

      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);

      try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/incidentes/estadisticas/por-tipo/${tipo}${query}`);
        if (res.ok) {
          const data: Incidente[] = await res.json();
          setDetalleIncidentes(data);
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorDetalle(err.detail || 'No se pudo cargar el detalle de incidentes.');
        }
      } catch {
        setErrorDetalle('Error de conexión al cargar detalle de incidentes.');
      } finally {
        setCargandoDetalle(false);
      }
    },
    [desde, hasta]
  );

  useEffect(() => {
    void cargarEstadisticas();
  }, [cargarEstadisticas]);

  useEffect(() => {
    if (categoriaSeleccionada) {
      void cargarDetalleCategoria(categoriaSeleccionada);
    } else {
      setDetalleIncidentes([]);
    }
  }, [categoriaSeleccionada, cargarDetalleCategoria]);

  const handleCambioPreset = (nuevoPreset: PeriodoPreset) => {
    setPeriodoPreset(nuevoPreset);
    setErrorStats(null);
    if (nuevoPreset === 'personalizado') return;

    const { d, h } = calcularFechasPreset(nuevoPreset);
    setDesde(d);
    setHasta(h);
    void cargarEstadisticas(d, h);
  };

  const handleAplicarPersonalizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (desde && hasta && desde > hasta) {
      setErrorStats("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
      return;
    }
    void cargarEstadisticas(desde, hasta);
  };

  const handleRefrescar = () => {
    void cargarEstadisticas();
    if (categoriaSeleccionada) {
      void cargarDetalleCategoria(categoriaSeleccionada);
    }
  };

  const datosGrafico = useMemo(() => {
    if (!estadisticas?.por_tipo) return [];
    return estadisticas.por_tipo.map((item) => ({
      tipo: item.tipo,
      nombre: item.nombre,
      nombreCorto: item.nombre.split('/')[0].trim(),
      cantidad: item.cantidad,
      porcentaje: item.porcentaje,
      color: COLORES_TIPO[item.tipo] || '#64748b',
    }));
  }, [estadisticas]);

  const kpis = useMemo(() => {
    const total = estadisticas?.total ?? 0;
    const items = estadisticas?.por_tipo ?? [];
    const masFrecuente = items.length > 0 && items[0].cantidad > 0 ? items[0] : null;
    const categoriasConIncidentes = items.filter((i) => i.cantidad > 0).length;

    return {
      total,
      masFrecuente,
      categoriasConIncidentes,
    };
  }, [estadisticas]);

  return (
    <div className="modulo-container modulo-incidentes-container">
      <div className="listado-top-bar" style={{ alignItems: 'flex-start' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Estadística de Incidentes por Tipo</h1>
          <div className="subtitulo">
            03 · Análisis de recurrencia por categoría para prevención de fallas operativas
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleRefrescar}
            className="btn-secundario"
            title="Actualizar datos"
            disabled={cargandoStats}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={cargandoStats ? { animation: 'spin 1s linear infinite' } : {}}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Actualizar
          </button>

          {onRegistrarClick && esOperador && (
            <button type="button" onClick={onRegistrarClick} className="btn-guardar">
              + Registrar Incidente
            </button>
          )}
        </div>
      </div>

      <div className="tabs-incidentes-header">
        {onVerAbiertos && (
          <button type="button" className="tab-incidente-btn" onClick={onVerAbiertos}>
            Abiertos
          </button>
        )}
        {onVerHistorial && (
          <button type="button" className="tab-incidente-btn" onClick={onVerHistorial}>
            Historial Completo
          </button>
        )}
        <button type="button" className="tab-incidente-btn activo">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Estadísticas por Tipo
        </button>
        {onVerCategorias && (
          <button type="button" className="tab-incidente-btn" onClick={onVerCategorias}>
            Categorías
          </button>
        )}
      </div>

      <div
        className="filtros-top-bar"
        style={{
          marginTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '12px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-texto)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Período:
            </span>

            <div className="filtros-segmentados">
              <button
                type="button"
                className={`filtro-segmento-btn ${periodoPreset === 'todo' ? 'activo' : ''}`}
                onClick={() => handleCambioPreset('todo')}
              >
                Todo el histórico
              </button>
              <button
                type="button"
                className={`filtro-segmento-btn ${periodoPreset === '7dias' ? 'activo' : ''}`}
                onClick={() => handleCambioPreset('7dias')}
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                className={`filtro-segmento-btn ${periodoPreset === '30dias' ? 'activo' : ''}`}
                onClick={() => handleCambioPreset('30dias')}
              >
                Últimos 30 días
              </button>
              <button
                type="button"
                className={`filtro-segmento-btn ${periodoPreset === 'anio' ? 'activo' : ''}`}
                onClick={() => handleCambioPreset('anio')}
              >
                Este año
              </button>
              <button
                type="button"
                className={`filtro-segmento-btn ${periodoPreset === 'personalizado' ? 'activo' : ''}`}
                onClick={() => handleCambioPreset('personalizado')}
              >
                Personalizado
              </button>
            </div>
          </div>
        </div>

        {periodoPreset === 'personalizado' && (
          <form
            onSubmit={handleAplicarPersonalizado}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              paddingTop: '12px',
              borderTop: '1px solid var(--color-borde)',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                htmlFor="fecha-desde"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-texto)' }}
              >
                Desde:
              </label>
              <input
                id="fecha-desde"
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setErrorStats(null);
                }}
                className="input-fecha-saia"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                htmlFor="fecha-hasta"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-texto)' }}
              >
                Hasta:
              </label>
              <input
                id="fecha-hasta"
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setErrorStats(null);
                }}
                className="input-fecha-saia"
              />
            </div>

            <button
              type="submit"
              className="btn-guardar"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Filtrar
            </button>

            {(desde || hasta) && (
              <button
                type="button"
                className="btn-secundario"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => {
                  setDesde('');
                  setHasta('');
                  void cargarEstadisticas();
                }}
              >
                Limpiar
              </button>
            )}
          </form>
        )}
      </div>

      {errorStats && (
        <div className="alerta-error" style={{ marginTop: '1rem' }}>
          {errorStats}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem',
        }}
      >
        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono total">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor">{kpis.total}</span>
            <span className="tarjeta-metrica-label">Total de Incidentes Registrados</span>
          </div>
        </div>

        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono atencion">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor" style={{ fontSize: '1.25rem' }}>
              {kpis.masFrecuente ? kpis.masFrecuente.nombre.split('/')[0].trim() : '—'}
            </span>
            <span className="tarjeta-metrica-label">
              Categoría Más Recurrente ({kpis.masFrecuente?.cantidad ?? 0})
            </span>
          </div>
        </div>

        <div className="tarjeta-metrica">
          <div className="tarjeta-metrica-icono critico">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="tarjeta-metrica-info">
            <span className="tarjeta-metrica-valor">{kpis.categoriasConIncidentes}</span>
            <span className="tarjeta-metrica-label">Categorías con Incidentes Activos</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)',
          gap: '1.25rem',
          marginTop: '1.25rem',
        }}
      >
        <div
          className="stats-panel-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
              Distribución de Incidentes por Categoría
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
              {categoriaSeleccionada ? (
                <button
                  type="button"
                  className="btn-secundario"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => setCategoriaSeleccionada(null)}
                >
                  Restablecer selección
                </button>
              ) : (
                'Haz clic en una barra para ver detalle'
              )}
            </span>
          </div>

          {cargandoStats ? (
            <div
              style={{
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-texto-sec)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Cargando estadísticas...
            </div>
          ) : kpis.total === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-h)', marginBottom: '0.25rem', fontSize: '1rem' }}>
                Sin incidentes registrados
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                No se registraron incidentes en el período seleccionado. Puedes seleccionar "Todo el histórico" o ampliar el rango de fechas para visualizar las estadísticas.
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosGrafico}
                  margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="nombreCorto"
                    tick={{ fill: 'var(--color-texto-sec)', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--color-texto-sec)', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as EstadisticaTipoItem & {
                          nombreCorto: string;
                          color: string;
                        };
                        return (
                          <div
                            style={{
                              backgroundColor: 'var(--color-superficie)',
                              border: '1px solid var(--color-borde)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ fontWeight: 700, color: d.color, marginBottom: '2px' }}>
                              {d.nombre}
                            </div>
                            <div>
                              <strong>{d.cantidad}</strong> {d.cantidad === 1 ? 'incidente' : 'incidentes'} ({d.porcentaje}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="cantidad"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry && entry.tipo) {
                        setCategoriaSeleccionada((prev) => (prev === entry.tipo ? null : entry.tipo));
                      }
                    }}
                  >
                    {datosGrafico.map((entry) => (
                      <Cell
                        key={`cell-${entry.tipo}`}
                        fill={entry.color}
                        opacity={categoriaSeleccionada && categoriaSeleccionada !== entry.tipo ? 0.35 : 1}
                        stroke={categoriaSeleccionada === entry.tipo ? 'var(--color-texto)' : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          className="stats-panel-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: 700 }}>
            Resumen por Categoría
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {datosGrafico.map((item) => {
              const esActiva = categoriaSeleccionada === item.tipo;
              return (
                <div
                  key={item.tipo}
                  onClick={() => setCategoriaSeleccionada((prev) => (prev === item.tipo ? null : item.tipo))}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${esActiva ? item.color : 'var(--color-borde)'}`,
                    backgroundColor: esActiva ? 'var(--color-suave)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Clic para filtrar detalle de incidentes"
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          display: 'inline-block',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: esActiva ? 700 : 500,
                        }}
                      >
                        {item.nombre}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
                      <strong>{item.cantidad}</strong> ({item.porcentaje}%)
                    </div>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'var(--color-fondo)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${item.porcentaje}%`,
                        backgroundColor: item.color,
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {categoriaSeleccionada && (
        <div
          className="stats-panel-card"
          style={{
            marginTop: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--color-borde)',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'var(--color-texto)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Detalle de Incidentes:
                <EtiquetaCategoria
                  nombre={ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada}
                  size="md"
                />
              </h2>
              <Badge
                variant="outline"
                style={{
                  fontSize: '13px',
                  padding: '4px 10px',
                  borderColor: COLORES_TIPO[categoriaSeleccionada] || '#64748b',
                }}
              >
                {detalleIncidentes.length} {detalleIncidentes.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>

            <button
              type="button"
              className="btn-secundario"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => setCategoriaSeleccionada(null)}
            >
              ✕ Cerrar Detalle
            </button>
          </div>

          {cargandoDetalle ? (
            <div
              style={{
                padding: '2.5rem',
                textAlign: 'center',
                color: 'var(--color-texto-sec)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Cargando incidentes de la categoría...
            </div>
          ) : errorDetalle ? (
            <div className="alerta-error" style={{ margin: '1rem 0' }}>
              {errorDetalle}
            </div>
          ) : detalleIncidentes.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-h)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                Sin incidentes
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                No hay incidentes de esta categoría registrados en el período filtrado.
              </div>
            </div>
          ) : (
            <div className="tabla-wrapper-incidentes">
              <table className="tabla-custom-incidentes">
                <thead>
                  <tr>
                    <th style={{ width: '14%' }}>Fecha</th>
                    <th style={{ width: '18%' }}>Reportado Por</th>
                    <th style={{ width: '38%' }}>Descripción</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Evidencia</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Estado</th>
                    <th className="acciones-col" style={{ width: '10%', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleIncidentes.map((inc) => {
                    const f = formatearFecha(inc.creado_el);
                    const partes = f.includes(',') ? f.split(',') : [f, ''];
                    const dia = partes[0].trim();
                    const hora = partes[1]?.trim();

                    return (
                      <tr
                        key={inc.id}
                        className="fila-incidente-clickeable"
                        onClick={() => setIncidenteParaModal(inc)}
                        title="Clic para ver detalle completo del incidente"
                      >
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-texto)',
                              fontSize: '12.5px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {dia}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-texto-sec)',
                              whiteSpace: 'nowrap',
                              marginTop: '2px',
                            }}
                          >
                            {hora ? `${hora} hs · ` : ''}#{inc.id}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-texto)',
                              fontSize: '13px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={inc.nombre_reportante || 'Operador'}
                          >
                            {inc.nombre_reportante || 'Operador'}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--color-texto-sec)',
                              marginTop: '2px',
                            }}
                          >
                            Legajo #{inc.reportado_por_id ?? '-'}
                          </div>
                        </td>
                        <td>
                          <div
                            title={inc.descripcion}
                            style={{
                              color: 'var(--color-texto)',
                              fontSize: '13px',
                              lineHeight: '1.4',
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
                              onClick={() => setIncidenteParaModal(inc)}
                            />
                          ) : (
                            <span
                              className="evidencia-sin-foto-pill"
                              title="Sin foto adjunta (clic para ver detalle)"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
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
                            className="btn-accion-tabla ver"
                            title="Ver detalle completo"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIncidenteParaModal(inc);
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {incidenteParaModal && (
        <DetalleIncidenteModal
          incidente={incidenteParaModal}
          onClose={() => setIncidenteParaModal(null)}
          onEstadoActualizado={() => {
            setIncidenteParaModal(null);
            handleRefrescar();
          }}
        />
      )}
    </div>
  );
};
