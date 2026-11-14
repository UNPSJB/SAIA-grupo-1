import React, { useEffect, useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipValueType,
  XAxis,
  YAxis,
} from 'recharts';
import '../../styles/dashboard.css';
import { useColoresTema } from './useColoresTemas';
import { useVistaPublica } from './contextDeVistaPublica';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import type { GraficoCumplimientoResponse } from '../dashboard/tipos';

const ETIQUETAS_UNIDAD: Record<string, string> = {
  kilogramos: 'Kilogramos (kg)',
  gramos: 'Gramos (g)',
  litros: 'Litros (L)',
  mililitros: 'Mililitros (ml)',
  unidades: 'Unidades (u)',
};

const ABREVIATURAS_UNIDAD: Record<string, string> = {
  kilogramos: 'kg',
  gramos: 'g',
  litros: 'L',
  mililitros: 'ml',
  unidades: 'u',
};

const formatearUnidad = (u?: string | null): string => {
  const norm = (u || '').toLowerCase().trim();
  return ETIQUETAS_UNIDAD[norm] || u || 'Unidad';
};

const abreviarUnidad = (u?: string | null): string => {
  const norm = (u || '').toLowerCase().trim();
  return ABREVIATURAS_UNIDAD[norm] || u || '';
};

interface PuntoCumplimientoPublico {
  etiqueta: string;
  porcentaje: number;
  tareas_completadas: number;
  tareas_pendientes: number;
  total_tareas: number;
  total_checklists: number;
}

interface TooltipPayloadItem {
  payload?: PuntoCumplimientoPublico;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
}

interface ProductoTotalPublico {
  id?: number;
  nombre: string;
  cantidad: number;
  lotes: number;
  unidad: string;
}

interface RadarCumplimientoItem {
  dimension: string;
  porcentaje: number;
  meta: number;
  tareas_completadas: number;
  total_tareas: number;
}

interface EstadisticasPublicas {
  dias_sin_incidentes: number | null;
  total_lotes: number;
  volumen_fabricado: number;
  unidad_volumen: string;
  producto_mas_elaborado: {
    nombre: string;
    lotes: number;
    cantidad: number;
    unidad: string;
  } | null;
  totales_productos: ProductoTotalPublico[];
  red_arana_cumplimiento: RadarCumplimientoItem[];
}

const PALETA_PRODUCCION = [
  '#0284c7',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#64748b',
];

const ESTADISTICAS_INICIALES: EstadisticasPublicas = {
  dias_sin_incidentes: null,
  total_lotes: 0,
  volumen_fabricado: 0,
  unidad_volumen: 'kilogramos',
  producto_mas_elaborado: null,
  totales_productos: [],
  red_arana_cumplimiento: [],
};

const CustomTooltipContent = ({ active, payload }: CustomTooltipProps): React.ReactElement | null => {
  if (active && payload && payload.length && payload[0].payload) {
    const data: PuntoCumplimientoPublico = payload[0].payload;
    const color =
      data.porcentaje >= 80
        ? 'var(--color-exito, #10b981)'
        : data.porcentaje >= 50
        ? 'var(--color-alerta, #f59e0b)'
        : 'var(--color-error, #ef4444)';

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

export const Panel_Publico: React.FC = () => {
  const colores = useColoresTema();
  const { config, setConfig } = useVistaPublica();
  const { identificadorId } = useParams<{ identificadorId: string }>();

  const [verificando, setVerificando] = useState(true);
  const [qrValido, setQrValido] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana'>('dia');
  const [tipoGrafico, setTipoGrafico] = useState<'lineas' | 'barras'>('lineas');
  const [rangoRapido, setRangoRapido] = useState<string>('7');
  const [cumplimientoData, setCumplimientoData] = useState<GraficoCumplimientoResponse | null>(null);
  const [cargandoCumplimiento, setCargandoCumplimiento] = useState(false);

  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('kilogramos');

  const [estadisticas, setEstadisticas] = useState<EstadisticasPublicas>(ESTADISTICAS_INICIALES);

  useEffect(() => {
    const verificarIdentificadorQR = async () => {
      try {
        setVerificando(true);
        const res = await apiFetch(`/identificadorQR/verificar/${identificadorId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          let mensaje = 'Este código QR no es válido o ha expirado.';
          if (typeof errorData.detail === 'string') {
            mensaje = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            mensaje = errorData.detail
              .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
              .join(', ');
          }
          throw new Error(mensaje);
        }

        const data = await res.json();
        
        setConfig(prev => ({
          ...prev,
          verGrafico: typeof data.ver_grafico === 'boolean' ? data.ver_grafico : prev.verGrafico,
          verAcercaDeNosotros: typeof data.verAcercaDeNosotros === 'boolean' ? data.verAcercaDeNosotros : prev.verAcercaDeNosotros,
          verProductos: typeof data.verProductos === 'boolean' ? data.verProductos : typeof data.ver_productos === 'boolean' ? data.ver_productos : prev.verProductos,
          verDiasSinIncidentes: typeof data.ver_dias_sin_incidentes === 'boolean' ? data.ver_dias_sin_incidentes : prev.verDiasSinIncidentes,
          verTotalLotes: typeof data.ver_total_lotes === 'boolean' ? data.ver_total_lotes : prev.verTotalLotes,
          verVolumenFabricado: typeof data.ver_volumen_fabricado === 'boolean' ? data.ver_volumen_fabricado : prev.verVolumenFabricado,
          verProductoMasElaborado: typeof data.ver_producto_mas_elaborado === 'boolean' ? data.ver_producto_mas_elaborado : prev.verProductoMasElaborado,
          verGraficoTotalesProductos: typeof data.ver_grafico_totales_productos === 'boolean' ? data.ver_grafico_totales_productos : prev.verGraficoTotalesProductos,
          verGraficoRedArana: typeof data.ver_grafico_red_arana === 'boolean' ? data.ver_grafico_red_arana : prev.verGraficoRedArana,
        }));

        setQrValido(true);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
        setQrValido(false);
      } finally {
        setVerificando(false);
      }
    };

    if (identificadorId) {
      verificarIdentificadorQR();
    } else {
      setVerificando(false);
      setQrValido(false);
      setErrorMsg('No se encontró ningún identificador en el enlace.');
    }
  }, [identificadorId, setConfig]);

  useEffect(() => {
    if (!qrValido || !identificadorId) return;

    const cargarEstadisticas = async () => {
      try {
        const res = await apiFetch(`/identificadorQR/${identificadorId}/estadisticas`);
        if (res.ok) {
          const data = await res.json();
          setEstadisticas({
            dias_sin_incidentes: data.dias_sin_incidentes ?? null,
            total_lotes: Number(data.total_lotes) || 0,
            volumen_fabricado: Number(data.volumen_fabricado) || 0,
            unidad_volumen: data.unidad_volumen || 'kilogramos',
            producto_mas_elaborado: data.producto_mas_elaborado || null,
            totales_productos: Array.isArray(data.totales_productos) ? data.totales_productos : [],
            red_arana_cumplimiento: Array.isArray(data.red_arana_cumplimiento) ? data.red_arana_cumplimiento : [],
          });
        }
      } catch {
        setEstadisticas(ESTADISTICAS_INICIALES);
      }
    };

    void cargarEstadisticas();
  }, [qrValido, identificadorId]);

  const unidadesDisponibles = useMemo(() => {
    const setU = new Set<string>();
    for (const p of estadisticas.totales_productos) {
      if (p.unidad) {
        setU.add(p.unidad.toLowerCase().trim());
      }
    }
    const lista = Array.from(setU);
    if (lista.length === 0) return ['kilogramos'];
    return lista;
  }, [estadisticas.totales_productos]);

  useEffect(() => {
    if (unidadesDisponibles.length > 0 && !unidadesDisponibles.includes(unidadSeleccionada)) {
      setUnidadSeleccionada(unidadesDisponibles[0]);
    }
  }, [unidadesDisponibles, unidadSeleccionada]);

  const datosProductosPorUnidad = useMemo(() => {
    const normUnidad = unidadSeleccionada.toLowerCase().trim();
    return estadisticas.totales_productos
      .filter((p) => (p.unidad || '').toLowerCase().trim() === normUnidad)
      .map((item, index) => ({
        ...item,
        cantidad: Math.round(item.cantidad * 100) / 100,
        color: PALETA_PRODUCCION[index % PALETA_PRODUCCION.length],
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [estadisticas.totales_productos, unidadSeleccionada]);

  const { desde, hasta } = useMemo(() => {
    const dias = parseInt(rangoRapido, 10) || 7;
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    return {
      desde: formatearFechaInput(inicio),
      hasta: formatearFechaInput(fin),
    };
  }, [rangoRapido]);

  useEffect(() => {
    if (!qrValido || !config.verGrafico) return;

    let cancelado = false;
    const cargarCumplimiento = async () => {
      try {
        setCargandoCumplimiento(true);
        const query = new URLSearchParams({
          agrupacion,
          desde,
          hasta,
        }).toString();

        const res = await apiFetch(`/dashboard/grafico-cumplimiento?${query}`);
        if (!cancelado) {
          if (res.ok) {
            const data: GraficoCumplimientoResponse = await res.json();
            setCumplimientoData(data);
          } else {
            setCumplimientoData(null);
          }
        }
      } catch {
        if (!cancelado) {
          setCumplimientoData(null);
        }
      } finally {
        if (!cancelado) {
          setCargandoCumplimiento(false);
        }
      }
    };

    void cargarCumplimiento();
    return () => {
      cancelado = true;
    };
  }, [qrValido, config.verGrafico, agrupacion, desde, hasta]);

  const puntos: PuntoCumplimientoPublico[] = useMemo(() => {
    return cumplimientoData ? cumplimientoData.puntos : [];
  }, [cumplimientoData]);

  const menorPeriodo: PuntoCumplimientoPublico | null = useMemo(() => {
    if (puntos.length === 0) return null;
    return puntos.reduce((min, p) => (p.porcentaje < min.porcentaje ? p : min), puntos[0]);
  }, [puntos]);

  const totalTareas = cumplimientoData ? cumplimientoData.total_tareas : 0;
  const tareasCompletadas = cumplimientoData ? cumplimientoData.tareas_completadas : 0;
  const tareasPendientes = Math.max(0, totalTareas - tareasCompletadas);
  const promedioCumplimiento = cumplimientoData ? cumplimientoData.promedio_cumplimiento : 0;
  const totalChecklists = cumplimientoData ? cumplimientoData.total_checklists : 0;

  const textoEstado = (pct: number) => {
    if (pct >= 80) return 'Óptimo';
    if (pct >= 50) return 'Regular';
    return 'Crítico';
  };

  const datosDona = useMemo(() => {
    if (totalTareas === 0) {
      return [{ name: 'Sin tareas', value: 1, color: colores.borde }];
    }
    return [
      { name: 'Realizadas', value: tareasCompletadas, color: colores.exito },
      { name: 'Pendientes', value: tareasPendientes, color: colores.alerta },
    ].filter((d) => d.value > 0);
  }, [totalTareas, tareasCompletadas, tareasPendientes, colores]);

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

  const mostrarTarjetas =
    config.verDiasSinIncidentes ||
    config.verTotalLotes ||
    config.verVolumenFabricado ||
    config.verProductoMasElaborado;

  const mostrarGraficosSecundarios =
    config.verGraficoTotalesProductos || config.verGraficoRedArana;

  const haySeccionesActivas =
    mostrarTarjetas || config.verGrafico || mostrarGraficosSecundarios;

  if (verificando) {
    return (
      <div className="modulo-container dashboard-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <h2>Verificando acceso público...</h2>
      </div>
    );
  }

  if (!qrValido) {
    return (
      <div className="modulo-container dashboard-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Acceso no disponible</h2>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="modulo-container dashboard-container">
      <div className="modulo-header">
        <h1>Estadisticas</h1>
        <div className="subtitulo">Información pública de cumplimiento, producción y calidad</div>
      </div>

      {mostrarTarjetas && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            width: '100%',
            marginBottom: '1.5rem',
          }}
        >
          {config.verDiasSinIncidentes && (
            <Card>
              <CardContent style={{ padding: '18px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Días sin incidentes
                </span>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-h)', marginTop: '6px' }}>
                  {estadisticas.dias_sin_incidentes !== null ? estadisticas.dias_sin_incidentes : '—'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  {estadisticas.dias_sin_incidentes !== null
                    ? estadisticas.dias_sin_incidentes === 1
                      ? 'día sin incidentes'
                      : 'días sin incidentes'
                    : 'sin incidentes registrados'}
                </div>
              </CardContent>
            </Card>
          )}

          {config.verTotalLotes && (
            <Card>
              <CardContent style={{ padding: '18px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Total de Lotes
                </span>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primario)', marginTop: '6px' }}>
                  {estadisticas.total_lotes}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  lotes elaborados en los últimos 7 días
                </div>
              </CardContent>
            </Card>
          )}

          {config.verVolumenFabricado && (
            <Card>
              <CardContent style={{ padding: '18px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Volumen Fabricado ({abreviarUnidad(estadisticas.unidad_volumen)})
                </span>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-h)', marginTop: '6px' }}>
                  {estadisticas.volumen_fabricado.toLocaleString('es-AR')} {abreviarUnidad(estadisticas.unidad_volumen)}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  volumen elaborado en los últimos 7 días
                </div>
              </CardContent>
            </Card>
          )}

          {config.verProductoMasElaborado && (
            <Card>
              <CardContent style={{ padding: '18px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
                  Producto Más Elaborado
                </span>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text-h)',
                    marginTop: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={estadisticas.producto_mas_elaborado ? estadisticas.producto_mas_elaborado.nombre : 'Sin lotes'}
                >
                  {estadisticas.producto_mas_elaborado ? estadisticas.producto_mas_elaborado.nombre : 'Sin lotes'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  {estadisticas.producto_mas_elaborado
                    ? `${estadisticas.producto_mas_elaborado.lotes} lotes (${estadisticas.producto_mas_elaborado.cantidad} ${abreviarUnidad(estadisticas.producto_mas_elaborado.unidad)}) en los últimos 7 días`
                    : 'sin lotes en los últimos 7 días'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {config.verGrafico && (
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem', width: '100%' }}>
          <div className="dashboard-card dashboard-card-cumplimiento" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="dashboard-card-header">
              <h2>Cumplimiento de Limpieza</h2>

              <div className="dashboard-header-controles">
                <select
                  className="dashboard-select"
                  value={rangoRapido}
                  onChange={(e) => setRangoRapido(e.target.value)}
                  title="Seleccionar período de análisis"
                >
                  <option value="7">Últimos 7 días</option>
                  <option value="14">Últimos 14 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                </select>

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

            <div className="dashboard-card-cuerpo">
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
                            paddingAngle={2}
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
                        {promedioCumplimiento}%
                      </div>
                    </div>

                    <Badge variant={obtenerBadgeVariante(promedioCumplimiento)}>
                      {textoEstado(promedioCumplimiento)}
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
                      <strong style={{ color: tareasPendientes > 0 ? colores.alerta : 'inherit' }}>{tareasPendientes}</strong>
                    </div>
                    <div className="dashboard-cumplimiento-metrica-item">
                      <span>Total programadas</span>
                      <strong>{totalTareas}</strong>
                    </div>
                    <div className="dashboard-cumplimiento-metrica-item">
                      <span>Checklists</span>
                      <strong>{totalChecklists}</strong>
                    </div>
                    <div className="dashboard-cumplimiento-metrica-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Mínimo</span>
                      <strong style={{ color: menorPeriodo ? obtenerColorPorcentaje(menorPeriodo.porcentaje) : 'var(--text)' }}>
                        {menorPeriodo ? `${menorPeriodo.porcentaje}%` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="dashboard-cumplimiento-grafico-box" style={{ height: '240px', width: '100%' }}>
                  {cargandoCumplimiento && !cumplimientoData ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-sec)', fontSize: '13px' }}>
                      Cargando datos...
                    </div>
                  ) : puntos.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-sec)', fontSize: '13px' }}>
                      No hay datos de cumplimiento para el período seleccionado.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {tipoGrafico === 'lineas' ? (
                        <AreaChart data={puntos} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCumplimientoPub" x1="0" y1="0" x2="0" y2="1">
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
                          <Tooltip content={CustomTooltipContent} />
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
                            fill="url(#colorCumplimientoPub)"
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
                          <Tooltip content={CustomTooltipContent} />
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
                              <Cell key={`bar-pub-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarGraficosSecundarios && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '20px',
            width: '100%',
            marginBottom: '1.5rem',
          }}
        >
          {config.verGraficoTotalesProductos && (
            <Card style={{ minHeight: '430px' }}>
              <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <CardTitle style={{ fontSize: '1rem' }}>Totales de Productos Fabricados</CardTitle>
                    <CardDescription>
                      Cantidad acumulada elaborada por producto en la unidad elegida
                    </CardDescription>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Unidad:</label>
                    <select
                      value={unidadSeleccionada}
                      onChange={(e) => setUnidadSeleccionada(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--color-superficie)',
                        color: 'var(--color-texto)',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {unidadesDisponibles.map((u) => (
                        <option key={u} value={u}>
                          {formatearUnidad(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent style={{ padding: '0 24px 20px 24px' }}>
                {datosProductosPorUnidad.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                    <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin productos en {formatearUnidad(unidadSeleccionada)}</strong>
                    <span>No se registraron productos producidos en esta unidad durante el período.</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart
                        data={datosProductosPorUnidad}
                        layout="vertical"
                        margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                        <XAxis type="number" stroke={colores.textoSec} fontSize={12} unit={` ${abreviarUnidad(unidadSeleccionada)}`} />
                        <YAxis
                          type="category"
                          dataKey="nombre"
                          stroke={colores.textoSec}
                          fontSize={12}
                          tickLine={false}
                          width={130}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                            borderColor: 'var(--color-borde)',
                            borderRadius: '8px',
                            color: 'var(--color-texto)',
                          }}
                          formatter={(val: TooltipValueType | undefined, _name: number | string | undefined, item: { payload?: ProductoTotalPublico }) => [
                            `${val ?? 0} ${abreviarUnidad(unidadSeleccionada)} (${item?.payload?.lotes || 0} lotes)`,
                            'Total Fabricado',
                          ]}
                        />
                        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                          {datosProductosPorUnidad.map((entry, index) => (
                            <Cell key={`prod-cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {config.verGraficoRedArana && (
            <Card style={{ minHeight: '430px' }}>
              <CardHeader style={{ padding: '20px 24px 12px 24px' }}>
                <CardTitle style={{ fontSize: '1.05rem' }}>Red de Araña: Cumplimiento de Limpieza</CardTitle>
                <CardDescription>Perfil multicriterio de cumplimiento higiénico por sector</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: '0 20px 20px 20px' }}>
                {estadisticas.red_arana_cumplimiento.length === 0 ? (
                  <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                    Sin datos suficientes para proyectar la red de cumplimiento.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={estadisticas.red_arana_cumplimiento}>
                        <PolarGrid stroke="var(--color-borde, #334155)" strokeDasharray="3 3" />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{ fill: 'var(--color-texto, #cbd5e1)', fontSize: 12, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          stroke="var(--color-texto-sec, #64748b)"
                          tick={{ fontSize: 10, fill: 'var(--color-texto-sec, #64748b)' }}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #1e293b)',
                            borderColor: 'var(--color-borde, #334155)',
                            borderRadius: '8px',
                            color: 'var(--color-texto, #f8fafc)',
                          }}
                          formatter={(val: TooltipValueType | undefined, name: number | string | undefined, item: { payload?: RadarCumplimientoItem }) => [
                            `${val ?? 0}% (${item?.payload?.tareas_completadas || 0}/${item?.payload?.total_tareas || 0} tareas)`,
                            name === 'porcentaje' ? 'Cumplimiento' : 'Meta',
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                        />
                        <Radar
                          name="Cumplimiento Real"
                          dataKey="porcentaje"
                          stroke={colores.primario}
                          fill={colores.primario}
                          fillOpacity={0.4}
                        />
                        <Radar
                          name="Meta (80%)"
                          dataKey="meta"
                          stroke={colores.exito}
                          fill={colores.exito}
                          fillOpacity={0.08}
                          strokeDasharray="4 4"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!haySeccionesActivas && (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-texto-sec)' }}>
          <p>No hay tarjetas ni gráficos configurados para mostrar en esta vista pública.</p>
        </div>
      )}
    </div>
  );
};
