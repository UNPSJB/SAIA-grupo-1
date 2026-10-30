import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { Badge } from '../../components/ui/badge';
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
  const [rangoRapido, setRangoRapido] = useState<string>('30');

  const [datos, setDatos] = useState<GraficoCumplimientoResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const errorRango = useMemo(() => {
    if (desde && desde < '2000-01-01') {
      return "La fecha 'Desde' no puede ser anterior al año 2000.";
    }
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  const aplicarRango = (valor: string) => {
    setRangoRapido(valor);
    if (valor === 'custom') return;
    const dias = parseInt(valor, 10);
    if (!isNaN(dias)) {
      const fin = new Date();
      const inicio = restarDias(fin, dias);
      setDesde(formatearFechaInput(inicio));
      setHasta(formatearFechaInput(fin));
    }
  };

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

  const tareasCompletadas = datos?.tareas_completadas || 0;
  const totalTareas = datos?.total_tareas || 0;
  const tareasPendientes = Math.max(0, totalTareas - tareasCompletadas);

  const datosDona = totalTareas === 0
    ? [{ name: 'Sin tareas', value: 1, color: colores.borde }]
    : [
        { name: 'Realizadas', value: tareasCompletadas, color: colores.exito },
        { name: 'Pendientes', value: tareasPendientes, color: colores.alerta },
      ].filter((d) => d.value > 0);

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
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: 'var(--shadow)',
            minWidth: '170px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-h)', marginBottom: '4px' }}>
            {data.etiqueta}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text)' }}>Cumplimiento:</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color,
                backgroundColor: 'var(--code-bg)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: `1px solid ${color}`,
              }}
            >
              {data.porcentaje}%
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', fontSize: '11px', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Realizadas:</span>
              <strong style={{ color: 'var(--text-h)' }}>{data.tareas_completadas} / {data.total_tareas}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pendientes:</span>
              <strong style={{ color: 'var(--text-h)' }}>{data.tareas_pendientes}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Checklists:</span>
              <strong style={{ color: 'var(--text-h)' }}>{data.total_checklists}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-card dashboard-card-cumplimiento">
      <div className="dashboard-card-header">
        <h2>Cumplimiento de Limpieza</h2>

        <div className="dashboard-header-controles">
          <select
            className="dashboard-select"
            value={rangoRapido}
            onChange={(e) => aplicarRango(e.target.value)}
            title="Seleccionar período de análisis"
          >
            <option value="7">Últimos 7 días</option>
            <option value="14">Últimos 14 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="custom">Personalizado</option>
          </select>

          {rangoRapido === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                className="dashboard-select"
                value={desde}
                min="2000-01-01"
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                title="Fecha desde"
              />
              <span style={{ fontSize: '11px', color: 'var(--text)' }}>-</span>
              <input
                type="date"
                className="dashboard-select"
                value={hasta}
                min={desde || '2000-01-01'}
                onChange={(e) => setHasta(e.target.value)}
                title="Fecha hasta"
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              type="button"
              className={`dashboard-badge dashboard-badge-btn ${tipoGrafico === 'lineas' ? 'dashboard-badge-info' : 'dashboard-badge-al-dia'}`}
              onClick={() => setTipoGrafico('lineas')}
              title="Ver en gráfico de líneas"
            >
              Líneas
            </button>
            <button
              type="button"
              className={`dashboard-badge dashboard-badge-btn ${tipoGrafico === 'barras' ? 'dashboard-badge-info' : 'dashboard-badge-al-dia'}`}
              onClick={() => setTipoGrafico('barras')}
              title="Ver en gráfico de barras"
            >
              Barras
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              type="button"
              className={`dashboard-badge dashboard-badge-btn ${agrupacion === 'dia' ? 'dashboard-badge-info' : 'dashboard-badge-al-dia'}`}
              onClick={() => setAgrupacion('dia')}
              title="Agrupar por día"
            >
              Día
            </button>
            <button
              type="button"
              className={`dashboard-badge dashboard-badge-btn ${agrupacion === 'semana' ? 'dashboard-badge-info' : 'dashboard-badge-al-dia'}`}
              onClick={() => setAgrupacion('semana')}
              title="Agrupar por semana"
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {errorValidacion && (
        <div
          style={{
            margin: '4px 0',
            padding: '4px 8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11.5px',
          }}
        >
          {errorValidacion}
        </div>
      )}

      <div className="dashboard-card-cuerpo">
        {cargando ? (
          <p className="dashboard-sin-datos">Cargando cumplimiento...</p>
        ) : !hayDatos ? (
          <div className="dashboard-sin-datos" style={{ padding: '2rem 1rem' }}>
            <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-h)', marginBottom: '4px' }}>
              Sin registros en el período
            </strong>
            <span>
              No se encontraron checklists entre el {formatearFechaVisual(desde)} y el {formatearFechaVisual(hasta)}.
            </span>
          </div>
        ) : (
          <div className="dashboard-cumplimiento-cuerpo">
            <div className="dashboard-cumplimiento-resumen-bloque">
              <div className="dashboard-cumplimiento-dona-box">
                <div className="dashboard-cumplimiento-dona-wrapper">
                  <ResponsiveContainer width={115} height={115}>
                    <PieChart>
                      <Pie
                        data={datosDona}
                        dataKey="value"
                        innerRadius={32}
                        outerRadius={47}
                        paddingAngle={datosDona.length > 1 ? 2 : 0}
                        stroke="none"
                      >
                        {datosDona.map((entry, index) => (
                          <Cell key={`dona-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada)',
                          borderColor: 'var(--color-borde)',
                          color: 'var(--color-texto)',
                          fontSize: '11px',
                          padding: '4px 8px',
                        }}
                        itemStyle={{ color: 'var(--color-texto)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dashboard-cumplimiento-dona-centro">
                    {datos ? `${datos.promedio_cumplimiento}%` : '0%'}
                  </div>
                </div>

                <Badge variant={obtenerBadgeVariante(datos?.promedio_cumplimiento || 0)}>
                  {(datos?.promedio_cumplimiento || 0) >= 80 ? 'Óptimo' : (datos?.promedio_cumplimiento || 0) >= 50 ? 'Regular' : 'Crítico'}
                </Badge>
              </div>

              <div className="dashboard-cumplimiento-metricas-box">
                <div className="dashboard-cumplimiento-metrica-item">
                  <span>
                    <i className="dashboard-cumplimiento-metrica-punto" style={{ backgroundColor: colores.exito }} />
                    Realizadas
                  </span>
                  <strong style={{ color: colores.exito }}>{tareasCompletadas}</strong>
                </div>
                <div className="dashboard-cumplimiento-metrica-item">
                  <span>
                    <i className="dashboard-cumplimiento-metrica-punto" style={{ backgroundColor: colores.alerta }} />
                    Pendientes
                  </span>
                  <strong style={{ color: tareasPendientes > 0 ? colores.alerta : 'inherit' }}>
                    {tareasPendientes}
                  </strong>
                </div>
                <div className="dashboard-cumplimiento-metrica-item">
                  <span>Total programadas</span>
                  <strong>{totalTareas}</strong>
                </div>
                <div className="dashboard-cumplimiento-metrica-item">
                  <span>Checklists</span>
                  <strong>{datos?.total_checklists || 0}</strong>
                </div>
                {menorPeriodo && (
                  <div className="dashboard-cumplimiento-metrica-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '2px' }}>
                    <span>Mínimo</span>
                    <strong style={{ color: obtenerColorPorcentaje(menorPeriodo.porcentaje) }}>
                      {menorPeriodo.porcentaje}%
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-cumplimiento-grafico-box">
              <ResponsiveContainer width="100%" height="100%">
                {tipoGrafico === 'lineas' ? (
                  <AreaChart data={puntos} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
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
                      fontSize={11}
                      tickLine={false}
                      interval={puntos.length > 14 ? 'preserveStartEnd' : 0}
                      angle={puntos.length > 8 ? -25 : 0}
                      textAnchor={puntos.length > 8 ? 'end' : 'middle'}
                      height={puntos.length > 8 ? 28 : 20}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={38}
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
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="porcentaje"
                      stroke={colores.primario}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCumplimiento)"
                      dot={{ r: 3.5, fill: colores.primario, strokeWidth: 1.5, stroke: 'var(--bg)' }}
                      activeDot={{ r: 5, stroke: colores.primario, strokeWidth: 2, fill: 'var(--bg)' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={puntos} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
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
                      fontSize={11}
                      tickLine={false}
                      interval={puntos.length > 14 ? 'preserveStartEnd' : 0}
                      angle={puntos.length > 8 ? -25 : 0}
                      textAnchor={puntos.length > 8 ? 'end' : 'middle'}
                      height={puntos.length > 8 ? 28 : 20}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={38}
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
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                    <Bar dataKey="porcentaje" radius={[4, 4, 0, 0]}>
                      {puntos.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-card-footer">
        <div className="dashboard-cumplimiento-footer">
          <div className="dashboard-cumplimiento-leyenda">
            <span className="dashboard-cumplimiento-leyenda-item">
              <i className="dashboard-cumplimiento-leyenda-punto" style={{ backgroundColor: colores.exito }} />
              Óptimo (≥ 80%)
            </span>
            <span className="dashboard-cumplimiento-leyenda-item">
              <i className="dashboard-cumplimiento-leyenda-punto" style={{ backgroundColor: colores.alerta }} />
              Atención (50% - 79%)
            </span>
            <span className="dashboard-cumplimiento-leyenda-item">
              <i className="dashboard-cumplimiento-leyenda-punto" style={{ backgroundColor: colores.error }} />
              Crítico (&lt; 50%)
            </span>
            <span className="dashboard-cumplimiento-leyenda-item" style={{ fontStyle: 'italic' }}>
              <i className="dashboard-cumplimiento-leyenda-linea" style={{ borderColor: colores.exito }} />
              Meta: 80%
            </span>
          </div>

          {onVerMas && (
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={onVerMas}
            >
              Ver más &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
