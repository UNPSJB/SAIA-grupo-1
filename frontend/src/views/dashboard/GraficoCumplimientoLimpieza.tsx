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
import { useAuth } from '../../auth/useAuth';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import type { AgrupacionGrafico, GraficoCumplimientoResponse, PuntoCumplimiento } from './tipos';
import { useColoresTema } from './useColoresTema';

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

interface GraficoCumplimientoLimpiezaProps {
  onVerMas?: () => void;
}

export const GraficoCumplimientoLimpieza: React.FC<GraficoCumplimientoLimpiezaProps> = ({
  onVerMas,
}) => {
  const { esAdministrador } = useAuth();
  const colores = useColoresTema();

  const hoy = useMemo(() => new Date(), []);
  const [desde, setDesde] = useState<string>(() => formatearFechaInput(restarDias(hoy, 30)));
  const [hasta, setHasta] = useState<string>(() => formatearFechaInput(hoy));
  const [agrupacion, setAgrupacion] = useState<AgrupacionGrafico>('dia');
  const [tipoGrafico, setTipoGrafico] = useState<'lineas' | 'barras'>('lineas');

  const [datos, setDatos] = useState<GraficoCumplimientoResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const errorRango = useMemo(() => {
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  useEffect(() => {
    if (!esAdministrador) return;
    if (errorRango) {
      setErrorValidacion(errorRango);
      return;
    }
    setErrorValidacion(null);

    let cancelado = false;
    const fetchGrafico = async () => {
      setCargando(true);
      try {
        const query = new URLSearchParams({
          agrupacion,
          desde,
          hasta,
        }).toString();

        const res = await apiFetch(`/dashboard/grafico-cumplimiento?${query}`);
        if (!cancelado) {
          if (res.ok) {
            const data: GraficoCumplimientoResponse = await res.json();
            setDatos(data);
          } else {
            const err = await res.json().catch(() => null);
            setErrorValidacion(err?.detail || 'Error al obtener datos del gráfico.');
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

    fetchGrafico();
    return () => {
      cancelado = true;
    };
  }, [agrupacion, desde, hasta, errorRango, esAdministrador]);

  if (!esAdministrador) {
    return null;
  }

  const puntos = datos?.puntos || [];
  const hayDatos = puntos.length > 0;

  const menorPeriodo: PuntoCumplimiento | null = useMemo(() => {
    if (!hayDatos) return null;
    return puntos.reduce((min, p) => (p.porcentaje < min.porcentaje ? p : min), puntos[0]);
  }, [puntos, hayDatos]);

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

  const aplicarRangoRapido = (dias: number) => {
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  interface TooltipPayloadItem {
    payload: PuntoCumplimiento;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data: PuntoCumplimiento = payload[0].payload;
      const color = obtenerColorPorcentaje(data.porcentaje);

      return (
        <div
          style={{
            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
            border: '1px solid var(--color-borde)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            minWidth: '200px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-h)', marginBottom: '6px' }}>
            {data.etiqueta}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>Cumplimiento:</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color,
                backgroundColor: 'var(--color-fondo)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: `1px solid ${color}`,
              }}
            >
              {data.porcentaje}%
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-borde)', paddingTop: '6px', fontSize: '11.5px', color: 'var(--color-texto-sec)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tareas realizadas:</span>
              <strong style={{ color: 'var(--color-texto)' }}>{data.tareas_completadas} / {data.total_tareas}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tareas pendientes:</span>
              <strong style={{ color: 'var(--color-texto)' }}>{data.tareas_pendientes}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Checklists registrados:</span>
              <strong style={{ color: 'var(--color-texto)' }}>{data.total_checklists}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="dashboard-card-full">
      <CardHeader style={{ paddingBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primario)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <CardTitle>Cumplimiento de Limpieza en el Tiempo</CardTitle>
            </div>
            <CardDescription>
              Evolución cronológica del porcentaje de cumplimiento de checklists reales para detectar bajas de desempeño.
            </CardDescription>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {onVerMas && (
              <button
                type="button"
                className="dashboard-btn-detalle"
                onClick={onVerMas}
              >
                Ver más &rarr;
              </button>
            )}
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '8px',
                padding: '3px',
                backgroundColor: 'var(--color-fondo)',
                border: '1px solid var(--color-borde)',
              }}
            >
              <button
                type="button"
                onClick={() => setTipoGrafico('lineas')}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: tipoGrafico === 'lineas' ? 600 : 500,
                  backgroundColor: tipoGrafico === 'lineas' ? 'var(--color-superficie)' : 'transparent',
                  color: tipoGrafico === 'lineas' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: tipoGrafico === 'lineas' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'background-color 0.15s ease',
                }}
                title="Gráfico de líneas"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                Líneas
              </button>
              <button
                type="button"
                onClick={() => setTipoGrafico('barras')}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: tipoGrafico === 'barras' ? 600 : 500,
                  backgroundColor: tipoGrafico === 'barras' ? 'var(--color-superficie)' : 'transparent',
                  color: tipoGrafico === 'barras' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: tipoGrafico === 'barras' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'background-color 0.15s ease',
                }}
                title="Gráfico de barras"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Barras
              </button>
            </div>

            <div
              style={{
                display: 'inline-flex',
                borderRadius: '8px',
                padding: '3px',
                backgroundColor: 'var(--color-fondo)',
                border: '1px solid var(--color-borde)',
              }}
            >
              <button
                type="button"
                onClick={() => setAgrupacion('dia')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: agrupacion === 'dia' ? 600 : 500,
                  backgroundColor: agrupacion === 'dia' ? 'var(--color-superficie)' : 'transparent',
                  color: agrupacion === 'dia' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: agrupacion === 'dia' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Por Día
              </button>
              <button
                type="button"
                onClick={() => setAgrupacion('semana')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: agrupacion === 'semana' ? 600 : 500,
                  backgroundColor: agrupacion === 'semana' ? 'var(--color-superficie)' : 'transparent',
                  color: agrupacion === 'semana' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: agrupacion === 'semana' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Por Semana
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'var(--color-fondo)',
            borderRadius: '10px',
            border: '1px solid var(--color-borde)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Rango:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)' }}>Desde</label>
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-superficie)',
                  color: 'var(--color-texto)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)' }}>Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-superficie)',
                  color: 'var(--color-texto)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
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
              marginTop: '10px',
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorValidacion}</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {cargando ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--color-texto-sec)', fontSize: '13px' }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primario)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', display: 'inline-block' }}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <div>Calculando porcentaje de cumplimiento histórico...</div>
          </div>
        ) : !hayDatos ? (
          <div
            style={{
              padding: '48px 16px',
              textAlign: 'center',
              color: 'var(--color-texto-sec)',
              backgroundColor: 'var(--color-fondo)',
              borderRadius: '12px',
              border: '1px dashed var(--color-borde)',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--color-superficie)', border: '1px solid var(--color-borde)', marginBottom: '10px' }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-texto-sec)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="10" y1="14" x2="14" y2="18" />
                <line x1="14" y1="14" x2="10" y2="18" />
              </svg>
            </div>
            <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>
              Sin registros en el período
            </strong>
            <p style={{ fontSize: '12.5px', maxWidth: '420px', margin: '0 auto' }}>
              No se encontraron registros de checklist de limpieza entre el {formatearFechaVisual(desde)} y el {formatearFechaVisual(hasta)}.
              Prueba seleccionando otro rango de fechas.
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Promedio Cumplimiento
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {datos?.promedio_cumplimiento}%
                  </span>
                  <Badge variant={obtenerBadgeVariante(datos?.promedio_cumplimiento || 0)}>
                    {(datos?.promedio_cumplimiento || 0) >= 80 ? 'Óptimo' : (datos?.promedio_cumplimiento || 0) >= 50 ? 'Regular' : 'Crítico'}
                  </Badge>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Total Tareas Ejecutadas
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primario)' }}>
                    {datos?.tareas_completadas}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
                    / {datos?.total_tareas} programadas
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Checklists Evaluados
                </span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>
                  {datos?.total_checklists} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-texto-sec)' }}>registros</span>
                </span>
              </div>

              {menorPeriodo && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                    Menor Cumplimiento
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-h)' }}>
                      {menorPeriodo.etiqueta}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: obtenerColorPorcentaje(menorPeriodo.porcentaje),
                      }}
                    >
                      {menorPeriodo.porcentaje}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {tipoGrafico === 'lineas' ? (
                  <AreaChart data={puntos} margin={{ top: 16, right: 16, left: 6, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colores.primario} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colores.primario} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tickFormatter={(val: string) => {
                        if (agrupacion === 'dia') {
                          const p = val.split('/');
                          if (p.length === 3) return `${p[0]}/${p[1]}`;
                        }
                        return val;
                      }}
                      stroke={colores.textoSec}
                      fontSize={11.5}
                      tickLine={false}
                      interval={puntos.length > 14 ? 'preserveStartEnd' : 0}
                      angle={puntos.length > 8 ? -25 : 0}
                      textAnchor={puntos.length > 8 ? 'end' : 'middle'}
                      height={puntos.length > 8 ? 40 : 25}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      stroke={colores.textoSec}
                      fontSize={11.5}
                      tickLine={false}
                      width={42}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={80}
                      stroke={colores.exito}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Meta: 80%',
                        position: 'top',
                        fill: colores.exito,
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="porcentaje"
                      stroke={colores.primario}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCumplimiento)"
                      dot={{ r: 4, fill: colores.primario, strokeWidth: 2, stroke: 'var(--color-superficie)' }}
                      activeDot={{ r: 6, stroke: colores.primario, strokeWidth: 2, fill: 'var(--color-superficie)' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={puntos} margin={{ top: 16, right: 16, left: 6, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tickFormatter={(val: string) => {
                        if (agrupacion === 'dia') {
                          const p = val.split('/');
                          if (p.length === 3) return `${p[0]}/${p[1]}`;
                        }
                        return val;
                      }}
                      stroke={colores.textoSec}
                      fontSize={11.5}
                      tickLine={false}
                      interval={puntos.length > 14 ? 'preserveStartEnd' : 0}
                      angle={puntos.length > 8 ? -25 : 0}
                      textAnchor={puntos.length > 8 ? 'end' : 'middle'}
                      height={puntos.length > 8 ? 40 : 25}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      stroke={colores.textoSec}
                      fontSize={11.5}
                      tickLine={false}
                      width={42}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={80}
                      stroke={colores.exito}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Meta: 80%',
                        position: 'top',
                        fill: colores.exito,
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                    />
                    <Bar dataKey="porcentaje" radius={[6, 6, 0, 0]}>
                      {puntos.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-borde)',
                fontSize: '12px',
                color: 'var(--color-texto-sec)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colores.exito, display: 'inline-block' }} />
                Óptimo (≥ 80%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colores.alerta, display: 'inline-block' }} />
                Atención (50% - 79%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colores.error, display: 'inline-block' }} />
                Crítico (&lt; 50%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
                <span style={{ width: '16px', height: '2px', backgroundColor: colores.exito, borderBottom: '2px dashed', display: 'inline-block' }} />
                Meta de cumplimiento: 80%
              </span>
            </div>
          </div>
        )}
      </CardContent>
      {onVerMas && (
        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--color-borde)' }}>
          <button
            type="button"
            className="dashboard-btn-detalle"
            onClick={onVerMas}
          >
            Ver vista detallada de cumplimiento &rarr;
          </button>
        </CardFooter>
      )}
    </Card>
  );
};
