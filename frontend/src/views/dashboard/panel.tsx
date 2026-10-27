import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  ConsumoInsumo,
  CumplimientoResumen,
  IncidentesMetricasDashboard,
  PanelDashboardProps,
  Periodo,
  TipoDetalleEstadisticas,
} from './tipos';
import { VistaDetalleEstadisticas } from './vistaDetalle';
import { GraficoCumplimientoLimpieza } from './GraficoCumplimientoLimpieza';
import { apiFetch } from '../../api/client';
import '../../styles/dashboard.css';
import { useColoresTema } from './useColoresTema';

const PALETA_PRODUCCION = [
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
];

const UNIDADES_ESTANDAR = [
  { id: 'L', label: 'L' },
  { id: 'ML', label: 'ML' },
  { id: 'KG', label: 'KG' },
  { id: 'G', label: 'G' },
  { id: 'UN', label: 'UN' },
];

export const Panel: React.FC<PanelDashboardProps> = ({ onNavegar }) => {
  const colores = useColoresTema();
  const [vistaDetalle, setVistaDetalle] = useState<TipoDetalleEstadisticas | null>(null);

  const [periodoCumplimiento, setPeriodoCumplimiento] = useState<Periodo>('semana');
  const [cumplimiento, setCumplimiento] = useState<CumplimientoResumen | null>(null);
  const [loadingCumplimiento, setLoadingCumplimiento] = useState(true);

  const [periodoInsumos, setPeriodoInsumos] = useState<Periodo>('semana');
  const [unidadInsumos, setUnidadInsumos] = useState<string>('L');
  const [consumoInsumos, setConsumoInsumos] = useState<ConsumoInsumo[]>([]);
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<string[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(true);

  const [periodoProduccion, setPeriodoProduccion] = useState<Periodo>('semana');

  const [vencPersonal, setVencPersonal] = useState({ vencidos: 0, proximos: 0 });
  const [vencCalibraciones, setVencCalibraciones] = useState({ vencidos: 0, proximos: 0 });
  const [vencElementos, setVencElementos] = useState({ vencidos: 0, proximos: 0 });
  const [vencDocumentos, setVencDocumentos] = useState({ vencidos: 0, proximos: 0 });
  const [loadingVencimientos, setLoadingVencimientos] = useState(true);

  const [metricasIncidentes, setMetricasIncidentes] = useState<IncidentesMetricasDashboard | null>(null);
  const [loadingIncidentes, setLoadingIncidentes] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const cargarCumplimiento = async () => {
      setLoadingCumplimiento(true);
      try {
        const res = await apiFetch(`/dashboard/cumplimiento?periodo=${periodoCumplimiento}`);
        if (!cancelado && res.ok) {
          setCumplimiento(await res.json());
        }
      } catch (e) {
        console.error('Error al cargar cumplimiento del dashboard:', e);
      } finally {
        if (!cancelado) setLoadingCumplimiento(false);
      }
    };
    cargarCumplimiento();
    return () => {
      cancelado = true;
    };
  }, [periodoCumplimiento]);

  useEffect(() => {
    let cancelado = false;
    const cargarInsumos = async () => {
      setLoadingInsumos(true);
      try {
        const res = await apiFetch(
          `/dashboard/consumo-insumos?periodo=${periodoInsumos}&unidad=${encodeURIComponent(unidadInsumos)}`
        );
        if (!cancelado && res.ok) {
          const data = await res.json();
          setConsumoInsumos(data.consumo || []);
          if (Array.isArray(data.unidades_disponibles)) {
            setUnidadesDisponibles(data.unidades_disponibles);
          }
        }
      } catch (e) {
        console.error('Error al cargar insumos del dashboard:', e);
      } finally {
        if (!cancelado) setLoadingInsumos(false);
      }
    };
    cargarInsumos();
    return () => {
      cancelado = true;
    };
  }, [periodoInsumos, unidadInsumos]);

  useEffect(() => {
    let cancelado = false;
    const cargarVencimientos = async () => {
      setLoadingVencimientos(true);
      try {
        const [resVencSettled, resElemSettled] = await Promise.allSettled([
          apiFetch('/vencimientos/'),
          apiFetch('/elementosDeLimpieza/'),
        ]);

        if (cancelado) return;

        if (resVencSettled.status === 'fulfilled' && resVencSettled.value.ok) {
          const itemsVenc = await resVencSettled.value.json();
          if (Array.isArray(itemsVenc)) {
            const persVenc = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'personal' && x.estado === 'vencido').length;
            const persProx = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'personal' && x.estado === 'proximo').length;
            setVencPersonal({ vencidos: persVenc, proximos: persProx });

            const calibVenc = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'equipo' && x.estado === 'vencido').length;
            const calibProx = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'equipo' && x.estado === 'proximo').length;
            setVencCalibraciones({ vencidos: calibVenc, proximos: calibProx });

            const docVenc = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'documento' && x.estado === 'vencido').length;
            const docProx = itemsVenc.filter((x: { origen: string; estado: string }) => x.origen === 'documento' && x.estado === 'proximo').length;
            setVencDocumentos({ vencidos: docVenc, proximos: docProx });
          }
        }

        if (resElemSettled.status === 'fulfilled' && resElemSettled.value.ok) {
          const itemsElem = await resElemSettled.value.json();
          if (Array.isArray(itemsElem)) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const hoyMs = hoy.getTime();
            let vEl = 0;
            let pEl = 0;
            for (const el of itemsElem) {
              if (el.activo === false) continue;
              const rawFecha = el.fechaCambio ?? el.fecha_cambio;
              if (!rawFecha) continue;
              const strFecha = typeof rawFecha === 'string' ? (rawFecha.includes('T') ? rawFecha : rawFecha.replace(' ', 'T')) : rawFecha;
              const fechaLimite = new Date(strFecha);
              if (isNaN(fechaLimite.getTime())) continue;
              fechaLimite.setHours(0, 0, 0, 0);

              const diffTiempo = fechaLimite.getTime() - hoyMs;
              const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
              if (diffDias < 0) {
                vEl++;
              } else if (diffDias <= 2) {
                pEl++;
              }
            }
            setVencElementos({ vencidos: vEl, proximos: pEl });
          }
        }
      } catch (e) {
        console.error('Error al cargar datos de vencimientos:', e);
      } finally {
        if (!cancelado) setLoadingVencimientos(false);
      }
    };
    cargarVencimientos();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    const cargarIncidentes = async () => {
      setLoadingIncidentes(true);
      try {
        const res = await apiFetch('/incidentes/abiertos/metricas');
        if (!cancelado && res.ok) {
          const data = await res.json();
          setMetricasIncidentes(data);
        }
      } catch (e) {
        console.error('Error al cargar métricas de incidentes:', e);
      } finally {
        if (!cancelado) setLoadingIncidentes(false);
      }
    };
    cargarIncidentes();
    return () => {
      cancelado = true;
    };
  }, []);

  if (vistaDetalle) {
    return <VistaDetalleEstadisticas tipo={vistaDetalle} onVolver={() => setVistaDetalle(null)} />;
  }

  const opcionesUnidades = [
    ...UNIDADES_ESTANDAR,
    ...unidadesDisponibles
      .filter((u) => !UNIDADES_ESTANDAR.some((std) => std.id === u))
      .map((u) => ({ id: u, label: u })),
  ];

  const totalTareas =
    (cumplimiento?.hechas || 0) +
    (cumplimiento?.pendientes || 0) +
    (cumplimiento?.vencidas || 0);

  const datosDonaTareas = [
    { name: 'Hechas', value: cumplimiento?.hechas || 0, color: colores.exito },
    { name: 'Pendientes', value: cumplimiento?.pendientes || 0, color: colores.alerta },
    { name: 'Vencidas', value: cumplimiento?.vencidas || 0, color: colores.error },
  ];

  const datosFiltradosTareas = datosDonaTareas.filter((d) => d.value > 0);

  const incCriticos = metricasIncidentes?.por_antiguedad?.mas_72h || 0;
  const incEnAtencion = metricasIncidentes?.por_antiguedad?.entre_24h_y_72h || 0;
  const incRecientes = metricasIncidentes?.por_antiguedad?.menos_24h || 0;
  const incReabiertos = metricasIncidentes?.por_estado?.reabierto || 0;

  const datosProduccionSemana = [
    { nombre: 'Lun', cantidad: 28 },
    { nombre: 'Mar', cantidad: 35 },
    { nombre: 'Mié', cantidad: 31 },
    { nombre: 'Jue', cantidad: 42 },
    { nombre: 'Vie', cantidad: 38 },
    { nombre: 'Sáb', cantidad: 18 },
  ];

  const datosProduccionMes = [
    { nombre: 'Sem 1', cantidad: 180 },
    { nombre: 'Sem 2', cantidad: 210 },
    { nombre: 'Sem 3', cantidad: 195 },
    { nombre: 'Sem 4', cantidad: 230 },
  ];

  const datosProduccion = periodoProduccion === 'semana' ? datosProduccionSemana : datosProduccionMes;
  const lotesProducidos = periodoProduccion === 'semana' ? 14 : 58;

  const renderBadgeVencimiento = (
    vencidos: number,
    proximos: number,
    onVencidosClick?: () => void,
    onProximosClick?: () => void,
    onAlDiaClick?: () => void,
  ) => {
    if (vencidos === 0 && proximos === 0) {
      return (
        <button
          type="button"
          className="dashboard-badge dashboard-badge-al-dia dashboard-badge-btn"
          title="0 Vencidos"
          onClick={onAlDiaClick}
        >
          0
        </button>
      );
    }
    return (
      <div className="dashboard-item-badges">
        {vencidos > 0 && (
          <button
            type="button"
            className="dashboard-badge dashboard-badge-vencido dashboard-badge-btn"
            title={`${vencidos} ${vencidos === 1 ? 'Vencido' : 'Vencidos'}`}
            onClick={onVencidosClick}
          >
            {vencidos}
          </button>
        )}
        {proximos > 0 && (
          <button
            type="button"
            className="dashboard-badge dashboard-badge-proximo dashboard-badge-btn"
            title={`${proximos} ${proximos === 1 ? 'Próximo a vencer' : 'Próximos a vencer'}`}
            onClick={onProximosClick}
          >
            {proximos}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="modulo-container dashboard-container">
      <div className="modulo-header dashboard-header-compacto">
        <h1>Inicio</h1>
        <div className="subtitulo">Panel de estadísticas y control general</div>
      </div>

      <div className="dashboard-fila-1">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Vencimientos</h2>
          </div>

          <div className="dashboard-card-cuerpo">
            {loadingVencimientos ? (
              <p className="dashboard-sin-datos">Cargando vencimientos...</p>
            ) : (
              <div className="dashboard-lista-resumen">
                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('vencimientos', 'personal', 'TODOS');
                      else setVistaDetalle('vencimientos');
                    }}
                  >
                    Vencimientos de Personal
                  </button>
                  {renderBadgeVencimiento(
                    vencPersonal.vencidos,
                    vencPersonal.proximos,
                    () => (onNavegar ? onNavegar('vencimientos', 'personal', 'VENCIDOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('vencimientos', 'personal', 'PROXIMOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('vencimientos', 'personal', 'TODOS') : setVistaDetalle('vencimientos')),
                  )}
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('planDeCalibracion', undefined, 'TODOS');
                      else setVistaDetalle('vencimientos');
                    }}
                  >
                    Calibraciones de Equipos
                  </button>
                  {renderBadgeVencimiento(
                    vencCalibraciones.vencidos,
                    vencCalibraciones.proximos,
                    () => (onNavegar ? onNavegar('planDeCalibracion', undefined, 'VENCIDOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('planDeCalibracion', undefined, 'PROXIMOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('planDeCalibracion', undefined, 'TODOS') : setVistaDetalle('vencimientos')),
                  )}
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('elementosDeLimpieza', undefined, 'TODOS');
                      else setVistaDetalle('vencimientos');
                    }}
                  >
                    Recambio de Elementos
                  </button>
                  {renderBadgeVencimiento(
                    vencElementos.vencidos,
                    vencElementos.proximos,
                    () => (onNavegar ? onNavegar('elementosDeLimpieza', undefined, 'VENCIDOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('elementosDeLimpieza', undefined, 'PROXIMOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('elementosDeLimpieza', undefined, 'TODOS') : setVistaDetalle('vencimientos')),
                  )}
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('vencimientos', 'documentos', 'TODOS');
                      else setVistaDetalle('vencimientos');
                    }}
                  >
                    Vencimiento de Documentos
                  </button>
                  {renderBadgeVencimiento(
                    vencDocumentos.vencidos,
                    vencDocumentos.proximos,
                    () => (onNavegar ? onNavegar('vencimientos', 'documentos', 'VENCIDOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('vencimientos', 'documentos', 'PROXIMOS') : setVistaDetalle('vencimientos')),
                    () => (onNavegar ? onNavegar('vencimientos', 'documentos', 'TODOS') : setVistaDetalle('vencimientos')),
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card-footer">
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={() => {
                if (onNavegar) onNavegar('vencimientos', 'consolidado');
                else setVistaDetalle('vencimientos');
              }}
            >
              Ver más &rarr;
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Cumplimiento de Tareas</h2>
            <select
              className="dashboard-select"
              value={periodoCumplimiento}
              onChange={(e) => setPeriodoCumplimiento(e.target.value as Periodo)}
              title="Seleccionar período de cumplimiento"
            >
              <option value="dia">Diario</option>
              <option value="semana">Semanal</option>
              <option value="mes">Mensual</option>
            </select>
          </div>

          <div className="dashboard-card-cuerpo">
            {loadingCumplimiento ? (
              <p className="dashboard-sin-datos">Cargando cumplimiento...</p>
            ) : (
              <div className="dashboard-dona-fila">
                <div className="dashboard-dona-bloque">
                  <div className="dashboard-dona-wrapper">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        {totalTareas === 0 ? (
                          <Pie
                            data={[{ name: 'Sin tareas', value: 1 }]}
                            dataKey="value"
                            innerRadius={33}
                            outerRadius={48}
                            stroke="none"
                          >
                            <Cell fill={colores.borde} />
                          </Pie>
                        ) : (
                          <Pie
                            data={datosFiltradosTareas}
                            dataKey="value"
                            innerRadius={33}
                            outerRadius={48}
                            paddingAngle={datosFiltradosTareas.length > 1 ? 2 : 0}
                            stroke="none"
                          >
                            {datosFiltradosTareas.map((entry, index) => (
                              <Cell key={`tarea-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        )}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada)',
                            borderColor: 'var(--color-borde)',
                            color: 'var(--color-texto)',
                          }}
                          itemStyle={{ color: 'var(--color-texto)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-dona-centro">
                      {cumplimiento ? `${cumplimiento.porcentaje}%` : '0%'}
                    </div>
                  </div>
                </div>

                <div className="dashboard-dona-leyenda">
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.exito }} /> Hechas
                    <strong>{cumplimiento?.hechas || 0}</strong>
                  </span>
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.alerta }} /> Pendientes
                    <strong>{cumplimiento?.pendientes || 0}</strong>
                  </span>
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.error }} /> Vencidas
                    <strong>{cumplimiento?.vencidas || 0}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card-footer">
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={() => setVistaDetalle('tareas')}
            >
              Ver más &rarr;
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Incidentes</h2>
          </div>

          <div className="dashboard-card-cuerpo">
            {loadingIncidentes ? (
              <p className="dashboard-sin-datos">Cargando incidentes...</p>
            ) : (
              <div className="dashboard-lista-resumen">
                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('incidentes');
                    }}
                  >
                    Incidentes Críticos (+72h)
                  </button>
                  <div className="dashboard-item-badges">
                    <button
                      type="button"
                      className={`dashboard-badge ${incCriticos > 0 ? 'dashboard-badge-vencido' : 'dashboard-badge-al-dia'} dashboard-badge-btn`}
                      title={`${incCriticos} ${incCriticos === 1 ? 'Crítico (+72h)' : 'Críticos (+72h)'}`}
                      onClick={() => {
                        if (onNavegar) onNavegar('incidentes');
                      }}
                    >
                      {incCriticos}
                    </button>
                  </div>
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('incidentes');
                    }}
                  >
                    Incidentes de Urgencia Media (24h - 72h)
                  </button>
                  <div className="dashboard-item-badges">
                    <button
                      type="button"
                      className={`dashboard-badge ${incEnAtencion > 0 ? 'dashboard-badge-proximo' : 'dashboard-badge-al-dia'} dashboard-badge-btn`}
                      title={`${incEnAtencion} Urgencia media (24h - 72h)`}
                      onClick={() => {
                        if (onNavegar) onNavegar('incidentes');
                      }}
                    >
                      {incEnAtencion}
                    </button>
                  </div>
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('incidentes');
                    }}
                  >
                    Incidentes Recientes (&lt;24h)
                  </button>
                  <div className="dashboard-item-badges">
                    <button
                      type="button"
                      className={`dashboard-badge ${incRecientes > 0 ? 'dashboard-badge-info' : 'dashboard-badge-al-dia'} dashboard-badge-btn`}
                      title={`${incRecientes} ${incRecientes === 1 ? 'Reciente (<24h)' : 'Recientes (<24h)'}`}
                      onClick={() => {
                        if (onNavegar) onNavegar('incidentes');
                      }}
                    >
                      {incRecientes}
                    </button>
                  </div>
                </div>

                <div className="dashboard-item-resumen">
                  <button
                    type="button"
                    className="dashboard-item-link"
                    onClick={() => {
                      if (onNavegar) onNavegar('incidentes');
                    }}
                  >
                    Incidentes Reabiertos
                  </button>
                  <div className="dashboard-item-badges">
                    <button
                      type="button"
                      className={`dashboard-badge ${incReabiertos > 0 ? 'dashboard-badge-proximo' : 'dashboard-badge-al-dia'} dashboard-badge-btn`}
                      title={`${incReabiertos} ${incReabiertos === 1 ? 'Reabierto' : 'Reabiertos'}`}
                      onClick={() => {
                        if (onNavegar) onNavegar('incidentes');
                      }}
                    >
                      {incReabiertos}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card-footer">
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={() => setVistaDetalle('incidentes')}
            >
              Ver más &rarr;
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-fila-2">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Consumo de Insumos Químicos</h2>
            <div className="dashboard-header-controles">
              <select
                className="dashboard-select"
                value={periodoInsumos}
                onChange={(e) => setPeriodoInsumos(e.target.value as Periodo)}
                title="Seleccionar período de consumo de insumos"
              >
                <option value="dia">Diario</option>
                <option value="semana">Semanal</option>
                <option value="mes">Mensual</option>
              </select>
              <select
                className="dashboard-select"
                value={unidadInsumos}
                onChange={(e) => setUnidadInsumos(e.target.value)}
                title="Seleccionar unidad de medida"
              >
                {opcionesUnidades.map((opc) => (
                  <option key={opc.id} value={opc.id}>
                    {opc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-card-cuerpo">
            {loadingInsumos ? (
              <p className="dashboard-sin-datos">Cargando consumo de insumos...</p>
            ) : consumoInsumos.length === 0 ? (
              <p className="dashboard-sin-datos">
                No hay tareas completadas con consumo en este período.
              </p>
            ) : (
              <div className="dashboard-grafico-contenedor">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumoInsumos} margin={{ top: 8, right: 16, left: 12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="nombre"
                      stroke={colores.textoSec}
                      fontSize={11}
                      interval={0}
                      tickLine={false}
                      angle={-22}
                      textAnchor="end"
                      height={48}
                      tickFormatter={(val: string) => (val && val.length > 15 ? `${val.slice(0, 14)}…` : val)}
                    />
                    <YAxis
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={62}
                      label={{
                        value: `Consumo (${unidadInsumos})`,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 12,
                        fill: colores.textoSec,
                        fontSize: 11,
                        fontWeight: 500,
                        style: { textAnchor: 'middle' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada)',
                        borderColor: 'var(--color-borde)',
                        color: 'var(--color-texto)',
                      }}
                      itemStyle={{ color: 'var(--color-texto)' }}
                      cursor={{ fill: colores.suave }}
                      formatter={(valor) => [`${valor} ${unidadInsumos}`, 'Consumo']}
                      labelFormatter={(nombre) => `Insumo: ${nombre}`}
                    />
                    <Bar dataKey="cantidad" fill={colores.primario} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="dashboard-card-footer">
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={() => setVistaDetalle('insumos')}
            >
              Ver más &rarr;
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Estadísticas de Producción</h2>
            <div className="dashboard-header-controles">
              <span className="dashboard-kpi-pill">
                Lotes producidos: <strong>{lotesProducidos}</strong>
              </span>
              <select
                className="dashboard-select"
                value={periodoProduccion}
                onChange={(e) => setPeriodoProduccion(e.target.value as Periodo)}
                title="Seleccionar período de producción"
              >
                <option value="semana">Semanal</option>
                <option value="mes">Mensual</option>
              </select>
            </div>
          </div>

          <div className="dashboard-card-cuerpo">
            <div className="dashboard-grafico-contenedor">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosProduccion} margin={{ top: 8, right: 16, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    stroke={colores.textoSec}
                    fontSize={11}
                    interval={0}
                    tickLine={false}
                    height={32}
                    label={{
                      value: 'Período',
                      position: 'insideBottom',
                      offset: -2,
                      fill: colores.textoSec,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  <YAxis
                    stroke={colores.textoSec}
                    fontSize={11}
                    tickLine={false}
                    width={62}
                    label={{
                      value: 'Producción (u.)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 12,
                      fill: colores.textoSec,
                      fontSize: 11,
                      fontWeight: 500,
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-superficie-elevada)',
                      borderColor: 'var(--color-borde)',
                      color: 'var(--color-texto)',
                    }}
                    itemStyle={{ color: 'var(--color-texto)' }}
                    cursor={{ fill: colores.suave }}
                    formatter={(valor) => [`${valor} u.`, 'Producción']}
                    labelFormatter={(nombre) => `Período: ${nombre}`}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {datosProduccion.map((_, index) => (
                      <Cell
                        key={`produccion-bar-${index}`}
                        fill={PALETA_PRODUCCION[index % PALETA_PRODUCCION.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-card-footer">
            <button
              type="button"
              className="dashboard-btn-detalle"
              onClick={() => setVistaDetalle('produccion')}
            >
              Ver más &rarr;
            </button>
          </div>
        </div>
      </div>

      <GraficoCumplimientoLimpieza />
    </div>
  );
};
