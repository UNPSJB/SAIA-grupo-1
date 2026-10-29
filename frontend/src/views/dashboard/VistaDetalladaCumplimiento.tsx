import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import type {
  CumplimientoDetalladoResponse,
} from './tipos';
import { useColoresTema } from './useColoresTema';
import '../../styles/dashboard.css';

interface VistaDetalladaCumplimientoProps {
  onVolver: () => void;
}

interface SectorOpcion {
  id: number;
  nombre: string;
}

const formatearFechaInput = (d: Date): string => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const restarDias = (d: Date, dias: number): Date => {
  const res = new Date(d);
  res.setDate(res.getDate() - dias);
  return res;
};

const formatearFechaVisual = (fechaIso: string): string => {
  if (!fechaIso) return '';
  const partes = fechaIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaIso;
};

export const VistaDetalladaCumplimiento: React.FC<VistaDetalladaCumplimientoProps> = ({
  onVolver,
}) => {
  const colores = useColoresTema();

  const hoy = useMemo(() => new Date(), []);
  const [desde, setDesde] = useState<string>(() => formatearFechaInput(restarDias(hoy, 30)));
  const [hasta, setHasta] = useState<string>(() => formatearFechaInput(hoy));
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string>('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string>('TODOS');

  const [sectores, setSectores] = useState<SectorOpcion[]>([]);
  const [datos, setDatos] = useState<CumplimientoDetalladoResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [paginaActual, setPaginaActual] = useState<number>(1);
  const itemsPorPagina = 10;

  const errorRango = useMemo(() => {
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  useEffect(() => {
    let cancelado = false;
    const cargarSectores = async () => {
      try {
        const res = await apiFetch('/sectores/');
        if (!cancelado && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSectores(data);
          }
        }
      } catch (e) {
        console.error('Error al cargar sectores:', e);
      }
    };
    cargarSectores();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (errorRango) {
      setErrorValidacion(errorRango);
      return;
    }
    setErrorValidacion(null);

    let cancelado = false;
    const fetchDatos = async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams();
        if (desde) params.append('desde', desde);
        if (hasta) params.append('hasta', hasta);
        if (sectorSeleccionado) params.append('sector_id', sectorSeleccionado);
        if (turnoSeleccionado && turnoSeleccionado !== 'TODOS') params.append('turno', turnoSeleccionado);

        const res = await apiFetch(`/dashboard/cumplimiento-detallado?${params.toString()}`);
        if (!cancelado) {
          if (res.ok) {
            const data: CumplimientoDetalladoResponse = await res.json();
            setDatos(data);
            setPaginaActual(1);
          } else {
            const err = await res.json().catch(() => null);
            setErrorValidacion(err?.detail || 'Error al obtener datos detallados de cumplimiento.');
            setDatos(null);
          }
        }
      } catch {
        if (!cancelado) {
          setErrorValidacion('Error de conexión con el servidor.');
          setDatos(null);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    fetchDatos();
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, sectorSeleccionado, turnoSeleccionado, errorRango]);

  const aplicarRangoRapido = (dias: number) => {
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const limpiarFiltros = () => {
    const fin = new Date();
    setDesde(formatearFechaInput(restarDias(fin, 30)));
    setHasta(formatearFechaInput(fin));
    setSectorSeleccionado('');
    setTurnoSeleccionado('TODOS');
  };

  const obtenerColorPorcentaje = (pct: number) => {
    if (pct >= 80) return colores.exito;
    if (pct >= 50) return colores.alerta;
    return colores.error;
  };

  const obtenerBadgeVariante = (pct: number): 'al_dia' | 'proximo' | 'vencido' => {
    if (pct >= 80) return 'al_dia';
    if (pct >= 50) return 'proximo';
    return 'vencido';
  };

  const exportarCSV = () => {
    if (!datos || !datos.items_detalle || datos.items_detalle.length === 0) return;

    const cabeceras = [
      'ID',
      'Checklist ID',
      'Fecha',
      'Tarea',
      'Frecuencia',
      'Sector / Equipo',
      'Tipo',
      'Turno',
      'Responsable',
      'Estado',
      'Hora Fin',
    ];

    const filas = datos.items_detalle.map((it) => [
      it.id,
      it.checklist_id,
      it.fecha,
      `"${(it.nombre_tarea || '').replace(/"/g, '""')}"`,
      it.frecuencia,
      `"${(it.sector_o_equipo || '').replace(/"/g, '""')}"`,
      it.tipo_objeto,
      it.turno,
      `"${(it.responsable || '').replace(/"/g, '""')}"`,
      it.estado,
      it.hora_fin || '',
    ]);

    const contenidoCSV = '\uFEFF' + [cabeceras.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cumplimiento_detallado_${formatearFechaInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const items = datos?.items_detalle || [];
  const totalPaginas = Math.ceil(items.length / itemsPorPagina) || 1;
  const itemsPaginados = items.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const hayDatos = items.length > 0;
  const kpis = datos?.kpis;

  return (
    <div className="modulo-container dashboard-vista-detalle">
      <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="dashboard-breadcrumb-link" onClick={onVolver}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
          Inicio
        </button>
        <span className="dashboard-breadcrumb-separador">/</span>
        <span className="dashboard-breadcrumb-actual">Cumplimiento Detallado</span>
      </nav>

      <div className="dashboard-vista-detalle-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
          <div>
            <button type="button" className="dashboard-btn-volver" onClick={onVolver}>
              &larr; Volver al Dashboard
            </button>
            <h1 style={{ fontSize: '1.65rem', margin: '0.5rem 0 0.25rem 0', color: 'var(--text-h)' }}>
              Vista Detallada de Cumplimiento de Checklists y Limpieza
            </h1>
            <div className="subtitulo" style={{ fontSize: '0.88rem', color: 'var(--color-texto-sec)' }}>
              Desglose analítico de efectividad por sector físico, equipo y turno operativo
            </div>
          </div>

          {hayDatos && (
            <button
              type="button"
              className="dashboard-btn-volver"
              onClick={exportarCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'var(--color-primario)',
                color: 'var(--color-texto-sobre-primario, #ffffff)',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar a CSV
            </button>
          )}
        </div>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardContent style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Desde</label>
                <input
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => setDesde(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(e) => setHasta(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Sector</label>
                <select
                  value={sectorSeleccionado}
                  onChange={(e) => setSectorSeleccionado(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                >
                  <option value="">Todos los sectores</option>
                  {sectores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Turno</label>
                <select
                  value={turnoSeleccionado}
                  onChange={(e) => setTurnoSeleccionado(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                >
                  <option value="TODOS">Todos los turnos</option>
                  <option value="MAÑANA">Mañana</option>
                  <option value="TARDE">Tarde</option>
                  <option value="NOCHE">Noche</option>
                </select>
              </div>

              <button
                type="button"
                onClick={limpiarFiltros}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  color: 'var(--color-texto-sec)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>Atajos:</span>
              {[
                { label: '7 días', dias: 7 },
                { label: '14 días', dias: 14 },
                { label: '30 días', dias: 30 },
                { label: '90 días', dias: 90 },
              ].map((btn) => (
                <button
                  key={btn.dias}
                  type="button"
                  onClick={() => aplicarRangoRapido(btn.dias)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto-sec)',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {errorValidacion && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: 'var(--color-error-bg, rgba(239, 68, 68, 0.1))',
                color: 'var(--color-error, #dc2626)',
                borderRadius: '8px',
                border: '1px solid var(--color-error)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorValidacion}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {cargando ? (
        <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--color-texto-sec)', fontSize: '14px' }}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primario)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'inline-block' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div>Cargando estadísticas detalladas de cumplimiento...</div>
        </div>
      ) : !hayDatos ? (
        <div
          style={{
            padding: '54px 16px',
            textAlign: 'center',
            color: 'var(--color-texto-sec)',
            backgroundColor: 'var(--color-superficie)',
            borderRadius: '12px',
            border: '1px dashed var(--color-borde)',
            margin: '1rem 0',
          }}
        >
          <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', backgroundColor: 'var(--color-fondo)', border: '1px solid var(--color-borde)', marginBottom: '12px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-texto-sec)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="10" y1="14" x2="14" y2="18" />
              <line x1="14" y1="14" x2="10" y2="18" />
            </svg>
          </div>
          <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-h)', marginBottom: '6px' }}>
            Sin datos disponibles para los filtros seleccionados
          </strong>
          <p style={{ fontSize: '13px', maxWidth: '440px', margin: '0 auto' }}>
            No se encontraron checklists de limpieza entre el {formatearFechaVisual(desde)} y el {formatearFechaVisual(hasta)} con los filtros especificados. Modifica las fechas, sector o turno.
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <Card>
              <CardContent style={{ padding: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Cumplimiento General
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {kpis?.porcentaje_general}%
                  </span>
                  <Badge variant={obtenerBadgeVariante(kpis?.porcentaje_general || 0)}>
                    {(kpis?.porcentaje_general || 0) >= 80 ? 'Óptimo' : (kpis?.porcentaje_general || 0) >= 50 ? 'Regular' : 'Crítico'}
                  </Badge>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  {kpis?.total_checklists} checklists evaluados
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Tareas Realizadas
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primario)' }}>
                    {kpis?.tareas_completadas}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-texto-sec)' }}>
                    / {kpis?.total_tareas} tareas
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  {kpis?.tareas_pendientes} tareas pendientes
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Sector Crítico
                </span>
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {kpis?.sector_menor_cumplimiento || 'Sin datos'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: obtenerColorPorcentaje(kpis?.porcentaje_sector_menor || 0), marginTop: '2px' }}>
                    {kpis?.porcentaje_sector_menor !== undefined && kpis?.porcentaje_sector_menor !== null ? `${kpis.porcentaje_sector_menor}% cumplimiento` : '-'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Equipo Crítico
                </span>
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {kpis?.equipo_menor_cumplimiento || 'Sin datos'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: obtenerColorPorcentaje(kpis?.porcentaje_equipo_menor || 0), marginTop: '2px' }}>
                    {kpis?.porcentaje_equipo_menor !== undefined && kpis?.porcentaje_equipo_menor !== null ? `${kpis.porcentaje_equipo_menor}% cumplimiento` : '-'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Turno Crítico
                </span>
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {kpis?.turno_critico || 'Sin datos'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: obtenerColorPorcentaje(kpis?.porcentaje_turno_critico || 0), marginTop: '2px' }}>
                    {kpis?.porcentaje_turno_critico !== undefined && kpis?.porcentaje_turno_critico !== null ? `${kpis.porcentaje_turno_critico}% cumplimiento` : '-'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '16px',
              marginBottom: '1.5rem',
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '1rem' }}>Tendencia Temporal de Cumplimiento</CardTitle>
                <CardDescription>Evolución cronológica del porcentaje de cumplimiento general</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datos?.tendencia_temporal || []} margin={{ top: 12, right: 16, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="gradTendencia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colores.primario} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colores.primario} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis dataKey="etiqueta" stroke={colores.textoSec} fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} stroke={colores.textoSec} fontSize={11} tickLine={false} unit="%" width={40} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-superficie-elevada)', borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
                        formatter={(val) => [`${val}%`, 'Cumplimiento']}
                      />
                      <ReferenceLine y={80} stroke={colores.exito} strokeDasharray="4 4" label={{ value: 'Meta: 80%', fill: colores.exito, fontSize: 10.5 }} />
                      <Area type="monotone" dataKey="porcentaje" stroke={colores.primario} strokeWidth={2.5} fill="url(#gradTendencia)" dot={{ r: 3, fill: colores.primario }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '1rem' }}>Cumplimiento por Turno</CardTitle>
                <CardDescription>Efectividad operativa desglosada por turno de trabajo</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos?.desglose_por_turno || []} margin={{ top: 12, right: 16, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis dataKey="nombre" stroke={colores.textoSec} fontSize={11.5} tickLine={false} />
                      <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} stroke={colores.textoSec} fontSize={11} tickLine={false} unit="%" width={40} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-superficie-elevada)', borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
                        formatter={(val, _, item) => [
                          `${val}% (${item.payload.tareas_completadas}/${item.payload.total_tareas} tareas)`,
                          'Cumplimiento',
                        ]}
                      />
                      <ReferenceLine y={80} stroke={colores.exito} strokeDasharray="4 4" />
                      <Bar dataKey="porcentaje" radius={[6, 6, 0, 0]}>
                        {(datos?.desglose_por_turno || []).map((entry, index) => (
                          <Cell key={`turno-cell-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '16px',
              marginBottom: '1.5rem',
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '1rem' }}>Comparativa por Sector Físico</CardTitle>
                <CardDescription>Porcentaje de cumplimiento en cada sector de la planta</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos?.desglose_por_sector || []} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke={colores.textoSec} fontSize={11} unit="%" />
                      <YAxis type="category" dataKey="nombre" stroke={colores.textoSec} fontSize={11} tickLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-superficie-elevada)', borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
                        formatter={(val, _, item) => [
                          `${val}% (${item.payload.tareas_completadas}/${item.payload.total_tareas} tareas)`,
                          'Cumplimiento',
                        ]}
                      />
                      <ReferenceLine x={80} stroke={colores.exito} strokeDasharray="4 4" />
                      <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
                        {(datos?.desglose_por_sector || []).map((entry, index) => (
                          <Cell key={`sector-cell-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '1rem' }}>Comparativa por Equipo</CardTitle>
                <CardDescription>Identificación de equipos de producción críticos</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 260 }}>
                  {datos?.desglose_por_equipo && datos.desglose_por_equipo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datos.desglose_por_equipo} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke={colores.textoSec} fontSize={11} unit="%" />
                        <YAxis type="category" dataKey="nombre" stroke={colores.textoSec} fontSize={11} tickLine={false} width={90} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--color-superficie-elevada)', borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
                          formatter={(val, _, item) => [
                            `${val}% (${item.payload.tareas_completadas}/${item.payload.total_tareas} tareas)`,
                            `Equipo (${item.payload.subtitulo || 'Sector'})`,
                          ]}
                        />
                        <ReferenceLine x={80} stroke={colores.exito} strokeDasharray="4 4" />
                        <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
                          {datos.desglose_por_equipo.map((entry, index) => (
                            <Cell key={`equipo-cell-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)', fontSize: '13px' }}>
                      No hay tareas asignadas directamente a equipos en este filtro.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card style={{ marginBottom: '2rem' }}>
            <CardHeader style={{ paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <CardTitle style={{ fontSize: '1.05rem' }}>Registro Detallado de Tareas y Checklists</CardTitle>
                  <CardDescription>
                    Listado cronológico de tareas ejecutadas y pendientes para auditoría y control
                  </CardDescription>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
                  Total: <strong>{items.length}</strong> registros
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Fecha</th>
                      <th style={{ padding: '10px 12px' }}>Checklist</th>
                      <th style={{ padding: '10px 12px' }}>Tarea</th>
                      <th style={{ padding: '10px 12px' }}>Sector / Equipo</th>
                      <th style={{ padding: '10px 12px' }}>Turno</th>
                      <th style={{ padding: '10px 12px' }}>Responsable</th>
                      <th style={{ padding: '10px 12px' }}>Hora Fin</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPaginados.map((it) => (
                      <tr key={`item-${it.id}`} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>{formatearFechaVisual(it.fecha)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto-sec)' }}>#{it.checklist_id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-h)' }}>{it.nombre_tarea}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>
                          <span>{it.sector_o_equipo}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--color-texto-sec)', display: 'block' }}>{it.tipo_objeto}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>{it.turno}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>{it.responsable}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto-sec)' }}>{it.hora_fin || '-'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge variant={it.estado.toUpperCase() === 'REALIZADO' ? 'al_dia' : 'vencido'}>
                            {it.estado.toUpperCase() === 'REALIZADO' ? 'Realizado' : 'Pendiente'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-borde)', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--color-texto-sec)' }}>
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={paginaActual === 1}
                      onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--color-superficie)',
                        color: paginaActual === 1 ? 'var(--color-borde)' : 'var(--color-texto)',
                        cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={paginaActual === totalPaginas}
                      onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--color-superficie)',
                        color: paginaActual === totalPaginas ? 'var(--color-borde)' : 'var(--color-texto)',
                        cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

