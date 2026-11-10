import React, { useEffect, useState, useMemo } from 'react';
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
import '../../styles/dashboard.css';
import { useColoresTema } from './useColoresTemas';
import { useVistaPublica } from './contextDeVistaPublica';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';

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

// Tooltip flotante interactivo al pasar el mouse por el gráfico
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

export const Panel_Publico: React.FC = () => {
  const colores = useColoresTema();
  const { config, setConfig } = useVistaPublica();
  const { identificadorId } = useParams<{ identificadorId: string }>();

  const [verificando, setVerificando] = useState(true);
  const [qrValido, setQrValido] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados interactivos locales para la tarjeta
  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana'>('dia');
  const [tipoGrafico, setTipoGrafico] = useState<'lineas' | 'barras'>('lineas');
  const [rangoRapido, setRangoRapido] = useState<string>('7');

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
          let mensaje = "Este código QR no es válido o ha expirado.";
          if (typeof errorData.detail === "string") {
            mensaje = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            mensaje = errorData.detail
              .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
              .join(", ");
          }
          throw new Error(mensaje);
        }

        const data = await res.json();
        
        if (typeof data.ver_grafico === 'boolean') {
          setConfig(prev => ({ ...prev, verGrafico: data.ver_grafico }));
        }
        if (typeof data.verAcercaDeNosotros === 'boolean') {
          setConfig(prev => ({ ...prev, verAcercaDeNosotros: data.verAcercaDeNosotros }));
        }
        if (typeof data.verProductos === 'boolean' || typeof data.ver_productos === 'boolean') {
          setConfig(prev => ({ ...prev, verProductos: data.verProductos ?? data.ver_productos }));
        }

        setQrValido(true);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
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


  // Datos estáticos positivos para la vista pública
  const puntosEstaticos: PuntoCumplimientoPublico[] = useMemo(() => [
    { etiqueta: '05/11/2026', porcentaje: 90, tareas_completadas: 9, tareas_pendientes: 1, total_tareas: 10, total_checklists: 2 },
    { etiqueta: '06/11/2026', porcentaje: 85, tareas_completadas: 8, tareas_pendientes: 1, total_tareas: 9, total_checklists: 2 },
    { etiqueta: '07/11/2026', porcentaje: 100, tareas_completadas: 10, tareas_pendientes: 0, total_tareas: 10, total_checklists: 3 },
    { etiqueta: '08/11/2026', porcentaje: 95, tareas_completadas: 19, tareas_pendientes: 1, total_tareas: 20, total_checklists: 4 },
    { etiqueta: '09/11/2026', porcentaje: 88, tareas_completadas: 8, tareas_pendientes: 1, total_tareas: 9, total_checklists: 2 },
    { etiqueta: '10/11/2026', porcentaje: 92, tareas_completadas: 12, tareas_pendientes: 1, total_tareas: 13, total_checklists: 3 },
    { etiqueta: '11/11/2026', porcentaje: 96, tareas_completadas: 24, tareas_pendientes: 1, total_tareas: 25, total_checklists: 5 },
  ], []);

  const promedioCumplimiento = 92;
  const tareasCompletadas = 90;
  const totalTareas = 96;
  const tareasPendientes = 6;
  const totalChecklists = 21;

  const datosDona = [
    { name: 'Realizadas', value: tareasCompletadas, color: colores.exito },
    { name: 'Pendientes', value: tareasPendientes, color: colores.alerta },
  ];

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
        <div className="subtitulo">Cumplimiento de limpieza Ultimos 7 dias</div>
      </div>

      <div className="dashboard-grid">
        {config.verGrafico && (
          <div className="dashboard-card dashboard-card-cumplimiento" style={{ width: '100%', maxWidth: '900px' }}>
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
                      Óptimo
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
                      <strong style={{ color: colores.alerta }}>{tareasPendientes}</strong>
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
                      <strong style={{ color: obtenerColorPorcentaje(85) }}>
                        85%
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="dashboard-cumplimiento-grafico-box" style={{ height: '240px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {tipoGrafico === 'lineas' ? (
                      <AreaChart data={puntosEstaticos} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
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
                            const p = val.split('/');
                            if (p.length === 3) return `${p[0]}/${p[1]}`;
                            return val;
                          }}
                          stroke={colores.textoSec}
                          fontSize={11}
                          tickLine={false}
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
                        {/* 👈 Aquí agregamos el Tooltip interactivo con los detalles */}
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
                      <BarChart data={puntosEstaticos} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                        <XAxis
                          dataKey="etiqueta"
                          tickFormatter={(val: string) => {
                            const p = val.split('/');
                            if (p.length === 3) return `${p[0]}/${p[1]}`;
                            return val;
                          }}
                          stroke={colores.textoSec}
                          fontSize={11}
                          tickLine={false}
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
                          {puntosEstaticos.map((entry, index) => (
                            <Cell key={`bar-pub-${index}`} fill={obtenerColorPorcentaje(entry.porcentaje)} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
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
        )}
      </div>
    </div>
  );
};