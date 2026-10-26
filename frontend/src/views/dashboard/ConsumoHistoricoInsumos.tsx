import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { useColoresTema } from './useColoresTema';
import {
  COLORES_TIPO_QUIMICO,
  type AgrupacionTiempo,
  type ConsumoHistoricoResponse,
  type MovimientoInsumoQuimico,
} from './tipos';
import type { InsumoQuimico } from '../insumos_quimicos/tipos';
import '../../styles/formularioAlta.css';

export interface Props {
  onVolver: () => void;
  insumoIdInicial?: number | null;
  textoVolver?: string;
  mostrarBreadcrumbDashboard?: boolean;
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

const formatearFechaHoraVisual = (fechaIso?: string | null): string => {
  if (!fechaIso) return '-';
  try {
    const f = new Date(fechaIso);
    if (isNaN(f.getTime())) return fechaIso;
    return f.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(fechaIso);
  }
};

export const ConsumoHistoricoInsumos: React.FC<Props> = ({ onVolver, insumoIdInicial, textoVolver, mostrarBreadcrumbDashboard }) => {
  const { esAdministrador } = useAuth();
  const colores = useColoresTema();

  const hoy = useMemo(() => new Date(), []);
  const [desde, setDesde] = useState<string>(() => formatearFechaInput(restarDias(hoy, 30)));
  const [hasta, setHasta] = useState<string>(() => formatearFechaInput(hoy));
  const [insumoIdSeleccionado, setInsumoIdSeleccionado] = useState<string>(
    insumoIdInicial ? String(insumoIdInicial) : ''
  );
  const [agrupacionTiempo, setAgrupacionTiempo] = useState<AgrupacionTiempo>('dia');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('');
  const [pestañaGrafico, setPestañaGrafico] = useState<'evolucion' | 'tipo' | 'proveedor'>('evolucion');
  const [tipoGraficoEvolucion, setTipoGraficoEvolucion] = useState<'lineas' | 'barras'>('lineas');

  const [catalogoQuimicos, setCatalogoQuimicos] = useState<InsumoQuimico[]>([]);
  const [datos, setDatos] = useState<ConsumoHistoricoResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Buscador de movimientos
  const [busquedaMovimiento, setBusquedaMovimiento] = useState<string>('');

  // Validación de rango
  const errorRango = useMemo(() => {
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  // Cargar catálogo de químicos para el selector
  useEffect(() => {
    let cancelado = false;
    const fetchCatalogo = async () => {
      try {
        const res = await apiFetch('/api/insumos-quimicos');
        if (res.ok && !cancelado) {
          const list: InsumoQuimico[] = await res.json();
          setCatalogoQuimicos(list);
        }
      } catch {
        // Silencioso
      }
    };
    fetchCatalogo();
    return () => {
      cancelado = true;
    };
  }, []);

  // Cargar datos analíticos de consumo
  useEffect(() => {
    if (!esAdministrador) return;
    if (errorRango) {
      setErrorValidacion(errorRango);
      return;
    }
    setErrorValidacion(null);

    let cancelado = false;
    const fetchConsumo = async () => {
      setCargando(true);
      try {
        const query = new URLSearchParams();
        if (desde) query.append('desde', desde);
        if (hasta) query.append('hasta', hasta);
        if (insumoIdSeleccionado) query.append('insumo_id', insumoIdSeleccionado);
        if (agrupacionTiempo) query.append('agrupacion_tiempo', agrupacionTiempo);
        if (unidadSeleccionada) query.append('unidad', unidadSeleccionada);

        const res = await apiFetch(`/dashboard/historico-consumo?${query.toString()}`);
        if (!cancelado) {
          if (res.ok) {
            const data: ConsumoHistoricoResponse = await res.json();
            setDatos(data);
            if (!unidadSeleccionada && data.unidad_seleccionada) {
              setUnidadSeleccionada(data.unidad_seleccionada);
            }
          } else {
            const err = await res.json().catch(() => null);
            setErrorValidacion(err?.detail || 'Error al obtener datos históricos de consumo.');
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

    fetchConsumo();
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, insumoIdSeleccionado, agrupacionTiempo, unidadSeleccionada, errorRango, esAdministrador]);

  const aplicarRangoRapido = (dias: number) => {
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const aplicarAnioActual = () => {
    const fin = new Date();
    const inicio = new Date(fin.getFullYear(), 0, 1);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  // Filtrado de movimientos por buscador
  const movimientosFiltrados = useMemo(() => {
    const list = datos?.movimientos || [];
    if (!busquedaMovimiento.trim()) return list;
    const q = busquedaMovimiento.toLowerCase().trim();
    return list.filter((m) =>
      m.insumo_nombre.toLowerCase().includes(q) ||
      (m.responsable_nombre && m.responsable_nombre.toLowerCase().includes(q)) ||
      m.tarea_nombre.toLowerCase().includes(q) ||
      m.plan_nombre.toLowerCase().includes(q) ||
      (m.sector_o_equipo && m.sector_o_equipo.toLowerCase().includes(q)) ||
      (m.proveedor && m.proveedor.toLowerCase().includes(q)) ||
      (m.tipo && m.tipo.toLowerCase().includes(q))
    );
  }, [datos?.movimientos, busquedaMovimiento]);

  // Paginación de la tabla de movimientos
  const paginacionMovimientos = usePaginacion(movimientosFiltrados, 10);

  if (!esAdministrador) {
    return (
      <div className="formulario-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--color-error)' }}>Acceso restringido a personas con permiso de administrar.</p>
        <button type="button" className="btn-cancelar" onClick={onVolver}>Volver</button>
      </div>
    );
  }

  const hayDatos = (datos?.total_registros ?? 0) > 0;
  const metricas = datos?.metricas;
  const unidadUso = datos?.unidad_seleccionada || 'L';

  return (
    <div className="modulo-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {mostrarBreadcrumbDashboard && (
        <nav className="dashboard-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: '18px' }}>
          <button
            type="button"
            className="dashboard-breadcrumb-link"
            onClick={onVolver}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1.5" />
              <rect width="7" height="5" x="14" y="3" rx="1.5" />
              <rect width="7" height="9" x="14" y="12" rx="1.5" />
              <rect width="7" height="5" x="3" y="16" rx="1.5" />
            </svg>
            Inicio
          </button>
          <span className="dashboard-breadcrumb-separador">/</span>
          <span className="dashboard-breadcrumb-actual">Consumo de Insumos Químicos</span>
        </nav>
      )}

      {/* Encabezado Principal */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onVolver}
              className="btn-cancelar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              title={textoVolver || "Volver"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {textoVolver || "Volver"}
            </button>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-h)' }}>
              Consumo Histórico de Insumos Químicos
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--color-texto-sec)', fontSize: '0.9rem' }}>
            Auditoría analítica, trazabilidad de uso acumulado y variaciones de consumo para optimización de stock y costos.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card style={{ marginBottom: '24px' }}>
        <CardContent style={{ padding: '16px 20px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Fechas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Período:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)' }}>Desde</label>
                <input
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => setDesde(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
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
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Atajos Rápidos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[
                { label: '7d', dias: 7 },
                { label: '30d', dias: 30 },
                { label: '90d', dias: 90 },
              ].map((btn) => (
                <button
                  key={btn.dias}
                  type="button"
                  onClick={() => aplicarRangoRapido(btn.dias)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    borderRadius: '5px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto-sec)',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
              <button
                type="button"
                onClick={aplicarAnioActual}
                style={{
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  borderRadius: '5px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  color: 'var(--color-texto-sec)',
                  cursor: 'pointer',
                }}
              >
                Año actual
              </button>
            </div>

            {/* Selector de Insumo Específico */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Insumo:</label>
              <select
                value={insumoIdSeleccionado}
                onChange={(e) => setInsumoIdSeleccionado(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  color: 'var(--color-texto)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  maxWidth: '240px',
                }}
              >
                <option value="">Todos los insumos químicos</option>
                {catalogoQuimicos.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.nombre} ({q.tipo})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Unidad */}
            {(datos?.unidades_disponibles?.length ?? 0) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Unidad:</label>
                <select
                  value={unidadSeleccionada}
                  onChange={(e) => setUnidadSeleccionada(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  {datos?.unidades_disponibles.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Agrupación temporal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Agrupar:</span>
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '8px',
                  padding: '2px',
                  backgroundColor: 'var(--color-fondo)',
                  border: '1px solid var(--color-borde)',
                }}
              >
                {(['dia', 'semana', 'mes'] as AgrupacionTiempo[]).map((agr) => (
                  <button
                    key={agr}
                    type="button"
                    onClick={() => setAgrupacionTiempo(agr)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: agrupacionTiempo === agr ? 600 : 500,
                      backgroundColor: agrupacionTiempo === agr ? 'var(--color-superficie)' : 'transparent',
                      color: agrupacionTiempo === agr ? 'var(--text-h)' : 'var(--color-texto-sec)',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: agrupacionTiempo === agr ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {agr === 'dia' ? 'Día' : agr === 'semana' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorValidacion && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-error, #dc2626)',
                borderRadius: '8px',
                border: '1px solid var(--color-error, #dc2626)',
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
        </CardContent>
      </Card>

      {/* Estado Cargando */}
      {cargando ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
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
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Procesando histórico de consumo de insumos químicos...</div>
        </Card>
      ) : !hayDatos ? (
        /* Validación de Existencia de Datos: Estado Vacío Formal */
        <Card style={{ padding: '48px 24px', textAlign: 'center', margin: '20px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-fondo)',
              border: '1px solid var(--color-borde)',
              marginBottom: '12px',
            }}
          >
            <svg
              width="36"
              height="36"
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
          <CardTitle style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Sin registros de consumo en el período</CardTitle>
          <CardDescription style={{ maxWidth: '520px', margin: '0 auto 16px', fontSize: '13px' }}>
            No se encontraron tareas realizadas con consumo de insumos químicos en el rango seleccionado
            {insumoIdSeleccionado ? ' para este insumo específico' : ''}.
            Prueba seleccionando un rango de fechas más amplio o quitando el filtro de insumo.
          </CardDescription>
          <button
            type="button"
            onClick={() => {
              aplicarRangoRapido(90);
              setInsumoIdSeleccionado('');
            }}
            className="btn-primario"
            style={{ padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}
          >
            Ver últimos 90 días (Todos)
          </button>
        </Card>
      ) : (
        /* Contenido con Datos */
        <div>
          {/* Tarjetas KPI Superiores */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {/* KPI 1: Consumo Total */}
            <Card>
              <CardContent style={{ padding: '16px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-texto-sec)' }}>
                  Consumo Total ({unidadUso})
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {metricas?.consumo_total_periodo}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-texto-sec)' }}>{unidadUso}</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Variación vs Período Anterior */}
            <Card>
              <CardContent style={{ padding: '16px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-texto-sec)' }}>
                  Variación vs Período Anterior
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {(metricas?.variacion_porcentual ?? 0) > 0 ? `+${metricas?.variacion_porcentual}%` : `${metricas?.variacion_porcentual}%`}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor:
                        (metricas?.variacion_porcentual ?? 0) > 0
                          ? 'rgba(239, 68, 68, 0.1)'
                          : (metricas?.variacion_porcentual ?? 0) < 0
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'var(--color-fondo)',
                      color:
                        (metricas?.variacion_porcentual ?? 0) > 0
                          ? 'var(--color-error, #dc2626)'
                          : (metricas?.variacion_porcentual ?? 0) < 0
                          ? 'var(--color-exito, #10b981)'
                          : 'var(--color-texto-sec)',
                    }}
                  >
                    {(metricas?.variacion_porcentual ?? 0) > 0 ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        Mayor uso
                      </>
                    ) : (metricas?.variacion_porcentual ?? 0) < 0 ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        Ahorro
                      </>
                    ) : (
                      'Sin cambio'
                    )}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  Período previo: {metricas?.consumo_periodo_anterior} {unidadUso}
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Insumo Más Consumido */}
            <Card>
              <CardContent style={{ padding: '16px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-texto-sec)' }}>
                  Insumo Más Consumido
                </span>
                <div style={{ marginTop: '6px' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-h)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={metricas?.quimico_mas_consumido || 'Ninguno'}
                  >
                    {metricas?.quimico_mas_consumido || 'Sin registros'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-primario)', fontWeight: 600, marginTop: '2px' }}>
                    {metricas?.cantidad_quimico_mas_consumido} {unidadUso}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Promedio Diario */}
            <Card>
              <CardContent style={{ padding: '16px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-texto-sec)' }}>
                  Promedio Diario
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {metricas?.promedio_diario}
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-texto-sec)' }}>{unidadUso} / día</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                  {metricas?.total_movimientos} movimientos de limpieza
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Analíticos */}
          <Card style={{ marginBottom: '28px' }}>
            <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div>
                  <CardTitle>Análisis y Visualización de Uso</CardTitle>
                  <CardDescription>
                    {pestañaGrafico === 'evolucion'
                      ? `Evolución del volumen acumulado de químicos (${unidadUso}) a través del tiempo.`
                      : pestañaGrafico === 'tipo'
                      ? `Distribución del consumo según la función química del producto.`
                      : `Comparativa de consumo acumulado según el proveedor suministrador.`}
                  </CardDescription>
                </div>

                {/* Tabs de Dimensión */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: '8px',
                      padding: '3px',
                      backgroundColor: 'var(--color-fondo)',
                      border: '1px solid var(--color-borde)',
                    }}
                  >
                    {[
                      { id: 'evolucion', label: 'Evolución Temporal' },
                      { id: 'tipo', label: 'Por Tipo' },
                      { id: 'proveedor', label: 'Por Proveedor' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPestañaGrafico(tab.id as any)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: pestañaGrafico === tab.id ? 600 : 500,
                          backgroundColor: pestañaGrafico === tab.id ? 'var(--color-superficie)' : 'transparent',
                          color: pestañaGrafico === tab.id ? 'var(--text-h)' : 'var(--color-texto-sec)',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: pestañaGrafico === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Toggle Líneas / Barras (solo en evolución) */}
                  {pestañaGrafico === 'evolucion' && (
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
                        onClick={() => setTipoGraficoEvolucion('lineas')}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: tipoGraficoEvolucion === 'lineas' ? 600 : 500,
                          backgroundColor: tipoGraficoEvolucion === 'lineas' ? 'var(--color-superficie)' : 'transparent',
                          color: tipoGraficoEvolucion === 'lineas' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Gráfico de líneas / área"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 3v18h18" />
                          <path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                        Líneas
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoGraficoEvolucion('barras')}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: tipoGraficoEvolucion === 'barras' ? 600 : 500,
                          backgroundColor: tipoGraficoEvolucion === 'barras' ? 'var(--color-superficie)' : 'transparent',
                          color: tipoGraficoEvolucion === 'barras' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Gráfico de barras"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Barras
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {pestañaGrafico === 'evolucion' && (
                <div style={{ width: '100%', height: 320, marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {tipoGraficoEvolucion === 'lineas' ? (
                      <AreaChart data={datos?.evolucion || []} margin={{ top: 16, right: 20, left: 6, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorConsumoHistorico" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colores.primario} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={colores.primario} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                        <XAxis
                          dataKey="etiqueta"
                          stroke={colores.textoSec}
                          fontSize={11.5}
                          tickLine={false}
                          interval={(datos?.evolucion?.length ?? 0) > 12 ? 'preserveStartEnd' : 0}
                          angle={(datos?.evolucion?.length ?? 0) > 8 ? -20 : 0}
                          textAnchor={(datos?.evolucion?.length ?? 0) > 8 ? 'end' : 'middle'}
                          height={(datos?.evolucion?.length ?? 0) > 8 ? 40 : 25}
                        />
                        <YAxis
                          stroke={colores.textoSec}
                          fontSize={11.5}
                          tickLine={false}
                          width={44}
                          unit={` ${unidadUso}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                            borderColor: 'var(--color-borde)',
                            borderRadius: '8px',
                            color: 'var(--color-texto)',
                          }}
                          formatter={(valor: any) => [`${valor} ${unidadUso}`, 'Consumo Total']}
                          labelFormatter={(label) => `Período: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_consumido"
                          stroke={colores.primario}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorConsumoHistorico)"
                          dot={{ r: 4, fill: colores.primario, strokeWidth: 2, stroke: 'var(--color-superficie)' }}
                          activeDot={{ r: 6, stroke: colores.primario, strokeWidth: 2, fill: 'var(--color-superficie)' }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={datos?.evolucion || []} margin={{ top: 16, right: 20, left: 6, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                        <XAxis
                          dataKey="etiqueta"
                          stroke={colores.textoSec}
                          fontSize={11.5}
                          tickLine={false}
                          interval={(datos?.evolucion?.length ?? 0) > 12 ? 'preserveStartEnd' : 0}
                          angle={(datos?.evolucion?.length ?? 0) > 8 ? -20 : 0}
                          textAnchor={(datos?.evolucion?.length ?? 0) > 8 ? 'end' : 'middle'}
                          height={(datos?.evolucion?.length ?? 0) > 8 ? 40 : 25}
                        />
                        <YAxis
                          stroke={colores.textoSec}
                          fontSize={11.5}
                          tickLine={false}
                          width={44}
                          unit={` ${unidadUso}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                            borderColor: 'var(--color-borde)',
                            borderRadius: '8px',
                            color: 'var(--color-texto)',
                          }}
                          formatter={(valor: any) => [`${valor} ${unidadUso}`, 'Consumo Total']}
                          labelFormatter={(label) => `Período: ${label}`}
                        />
                        <Bar dataKey="total_consumido" fill={colores.primario} radius={[5, 5, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}

              {pestañaGrafico === 'tipo' && (
                <div style={{ width: '100%', minHeight: 280, marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datos?.por_tipo || []} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                      <XAxis type="number" stroke={colores.textoSec} fontSize={11.5} unit={` ${unidadUso}`} />
                      <YAxis dataKey="etiqueta" type="category" stroke={colores.textoSec} fontSize={12} tickLine={false} width={95} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                        }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} ${unidadUso} (${item.payload.porcentaje}%)`,
                          'Consumo Acumulado',
                        ]}
                      />
                      <Bar dataKey="cantidad_total" radius={[0, 4, 4, 0]}>
                        {(datos?.por_tipo || []).map((entry) => (
                          <Cell
                            key={entry.clave}
                            fill={COLORES_TIPO_QUIMICO[entry.clave] || colores.primario}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Leyenda y Desglose de Tipos */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      justifyContent: 'center',
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-borde)',
                    }}
                  >
                    {(datos?.por_tipo || []).map((t) => (
                      <div
                        key={t.clave}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--color-fondo)',
                          border: '1px solid var(--color-borde)',
                        }}
                      >
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: COLORES_TIPO_QUIMICO[t.clave] || '#64748b',
                          }}
                        />
                        <strong style={{ color: 'var(--text-h)' }}>{t.etiqueta}:</strong>
                        <span>{t.cantidad_total} {unidadUso}</span>
                        <span style={{ color: 'var(--color-texto-sec)', fontSize: '11px' }}>({t.porcentaje}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pestañaGrafico === 'proveedor' && (
                <div style={{ width: '100%', minHeight: 280, marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datos?.por_proveedor || []} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        stroke={colores.textoSec}
                        fontSize={11.5}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={45}
                      />
                      <YAxis stroke={colores.textoSec} fontSize={11.5} tickLine={false} width={44} unit={` ${unidadUso}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                        }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} ${unidadUso} (${item.payload.porcentaje}%) - ${item.payload.cantidad_movimientos} registros`,
                          'Consumo Total',
                        ]}
                      />
                      <Bar dataKey="cantidad_total" fill={colores.primario} radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listado Detallado de Movimientos */}
          <Card>
            <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <CardTitle>Listado Detallado de Movimientos</CardTitle>
                  <CardDescription>
                    Registro granular de cada uso de insumos químicos en tareas de limpieza completadas.
                  </CardDescription>
                </div>

                {/* Buscador en la tabla */}
                <div style={{ position: 'relative', width: '280px', maxWidth: '100%', flexShrink: 0, boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    placeholder="Buscar por químico, operador, tarea o sector..."
                    value={busquedaMovimiento}
                    onChange={(e) => setBusquedaMovimiento(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 12px 7px 32px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: 'var(--color-fondo)',
                      color: 'var(--color-texto)',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-texto-sec)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
            </CardHeader>

            <CardContent style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla-listado" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-fondo)', borderBottom: '1px solid var(--color-borde)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fecha / Hora</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Insumo Químico</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tipo</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Proveedor</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cantidad</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Responsable</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tarea y Plan</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Sector / Equipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginacionMovimientos.itemsPaginados.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                          {busquedaMovimiento ? 'No hay movimientos que coincidan con la búsqueda.' : 'No hay movimientos registrados en el período.'}
                        </td>
                      </tr>
                    ) : (
                      paginacionMovimientos.itemsPaginados.map((m: MovimientoInsumoQuimico) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--color-borde)', transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--color-texto-sec)' }}>
                            {formatearFechaHoraVisual(m.fecha_hora || m.fecha)}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>
                            {m.insumo_nombre}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#ffffff',
                                backgroundColor: COLORES_TIPO_QUIMICO[m.tipo || 'OTRO'] || '#64748b',
                              }}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-texto-sec)' }}>
                            {m.proveedor || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)', whiteSpace: 'nowrap' }}>
                            {m.cantidad} {m.unidad}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>
                              {m.responsable_nombre || `Legajo ${m.responsable_legajo ?? '-'}`}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-h)' }}>{m.tarea_nombre}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>{m.plan_nombre}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-texto-sec)' }}>
                            {m.sector_o_equipo || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              {movimientosFiltrados.length > 10 && (
                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Paginacion
                    paginaActual={paginacionMovimientos.paginaActual}
                    totalPaginas={paginacionMovimientos.totalPaginas}
                    totalRegistros={paginacionMovimientos.totalRegistros}
                    indiceInicio={paginacionMovimientos.indiceInicio}
                    indiceFin={paginacionMovimientos.indiceFin}
                    filasPorPagina={paginacionMovimientos.filasPorPagina}
                    onCambiarPagina={paginacionMovimientos.setPaginaActual}
                    onCambiarFilasPorPagina={paginacionMovimientos.setFilasPorPagina}
                    etiqueta="movimientos"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
