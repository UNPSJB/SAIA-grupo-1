import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { useColoresTema } from '../dashboard/useColoresTema';
import { DetalleIncidenteModal } from './detalleModal';
import {
  COLORES_TIPO,
  ETIQUETAS_ESTADO,
  ETIQUETAS_TIPO,
  EtiquetaCategoria,
  formatearFecha,
  type EstadisticaIncidentesPorTipo,
  type Incidente,
  type TipoIncidente,
} from './tipos';
import '../../styles/dashboard.css';
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

export interface EstadisticasIncidentesProps {
  onVolver?: () => void;
  onVerAbiertos?: () => void;
  onVerHistorial?: () => void;
  onVerCategorias?: () => void;
  onRegistrarClick?: () => void;
}

export const EstadisticasIncidentes: React.FC<EstadisticasIncidentesProps> = ({
  onVolver,
}) => {
  const colores = useColoresTema();
  const hoy = useMemo(() => new Date(), []);

  const [desde, setDesde] = useState<string>(() => formatearFechaInput(restarDias(hoy, 30)));
  const [hasta, setHasta] = useState<string>(() => formatearFechaInput(hoy));
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<TipoIncidente | null>(null);
  const [busquedaIncidente, setBusquedaIncidente] = useState<string>('');
  const [agrupacionTemporal, setAgrupacionTemporal] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [tipoGraficoEvolucion, setTipoGraficoEvolucion] = useState<'lineas' | 'barras'>('lineas');

  const [estadisticas, setEstadisticas] = useState<EstadisticaIncidentesPorTipo | null>(null);
  const [cargandoStats, setCargandoStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  const [incidentesLista, setIncidentesLista] = useState<Incidente[]>([]);
  const [cargandoIncidentes, setCargandoIncidentes] = useState(false);
  const [errorIncidentes, setErrorIncidentes] = useState<string | null>(null);

  const [incidenteParaModal, setIncidenteParaModal] = useState<Incidente | null>(null);

  const errorRango = useMemo(() => {
    if (desde && desde < '2000-01-01') {
      return "La fecha 'Desde' no puede ser anterior al año 2000.";
    }
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  const cargarEstadisticas = useCallback(async () => {
    if (errorRango) return;
    setCargandoStats(true);
    setErrorStats(null);

    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

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
  }, [desde, hasta, errorRango]);

  const cargarIncidentes = useCallback(async () => {
    if (errorRango) return;
    setCargandoIncidentes(true);
    setErrorIncidentes(null);

    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

    try {
      const query = params.toString() ? `?${params.toString()}` : '';
      const url = categoriaSeleccionada
        ? `/incidentes/estadisticas/por-tipo/${categoriaSeleccionada}${query}`
        : `/incidentes/${query}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data: Incidente[] = await res.json();
        setIncidentesLista(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorIncidentes(err.detail || 'No se pudieron cargar los incidentes.');
        setIncidentesLista([]);
      }
    } catch {
      setErrorIncidentes('Error de conexión con el servidor al cargar incidentes.');
      setIncidentesLista([]);
    } finally {
      setCargandoIncidentes(false);
    }
  }, [desde, hasta, categoriaSeleccionada, errorRango]);

  useEffect(() => {
    void cargarEstadisticas();
  }, [cargarEstadisticas]);

  useEffect(() => {
    void cargarIncidentes();
  }, [cargarIncidentes]);

  const aplicarAtajo = (dias: number) => {
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const aplicarAtajoAnio = () => {
    const fin = new Date();
    const inicio = new Date(Math.max(2000, fin.getFullYear()), 0, 1);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const aplicarAtajoTodo = () => {
    setDesde('');
    setHasta('');
  };

  const limpiarFiltros = () => {
    const fin = new Date();
    setDesde(formatearFechaInput(restarDias(fin, 30)));
    setHasta(formatearFechaInput(fin));
    setCategoriaSeleccionada(null);
    setBusquedaIncidente('');
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

  const datosEvolucionTemporal = useMemo(() => {
    let fechaInicio: Date;
    let fechaFin: Date;

    if (desde && hasta) {
      fechaInicio = new Date(`${desde}T00:00:00`);
      fechaFin = new Date(`${hasta}T00:00:00`);
    } else {
      let minMs = Infinity;
      let maxMs = -Infinity;
      for (const inc of incidentesLista) {
        if (inc.creado_el) {
          const ms = new Date(inc.creado_el).getTime();
          if (!isNaN(ms)) {
            if (ms < minMs) minMs = ms;
            if (ms > maxMs) maxMs = ms;
          }
        }
      }
      if (minMs !== Infinity && maxMs !== -Infinity) {
        fechaInicio = new Date(minMs);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(maxMs);
        fechaFin.setHours(0, 0, 0, 0);
      } else {
        const hoyD = new Date();
        hoyD.setHours(0, 0, 0, 0);
        fechaFin = hoyD;
        fechaInicio = restarDias(hoyD, 30);
      }
    }

    if (fechaInicio > fechaFin) {
      return [];
    }

    const minFecha2000 = new Date('2000-01-01T00:00:00');
    if (fechaInicio < minFecha2000) {
      fechaInicio = minFecha2000;
    }

    if (agrupacionTemporal === 'dia') {
      const conteos = new Map<string, number>();
      for (const inc of incidentesLista) {
        if (inc.creado_el && inc.creado_el.length >= 10) {
          const k = inc.creado_el.slice(0, 10);
          conteos.set(k, (conteos.get(k) || 0) + 1);
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; cantidad: number }[] = [];
      const cur = new Date(fechaInicio);
      while (cur <= fechaFin) {
        const anio = cur.getFullYear();
        const mes = String(cur.getMonth() + 1).padStart(2, '0');
        const dia = String(cur.getDate()).padStart(2, '0');
        const clave = `${anio}-${mes}-${dia}`;
        puntos.push({
          clave,
          etiqueta: `${dia}/${mes}`,
          etiquetaCompleta: `${dia}/${mes}/${anio}`,
          cantidad: conteos.get(clave) || 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
      return puntos;
    }

    if (agrupacionTemporal === 'semana') {
      const obtenerInicioSemana = (d: Date): Date => {
        const r = new Date(d);
        r.setHours(0, 0, 0, 0);
        const day = r.getDay();
        r.setDate(r.getDate() - day);
        return r;
      };

      const conteos = new Map<string, number>();
      for (const inc of incidentesLista) {
        if (inc.creado_el) {
          const d = new Date(inc.creado_el);
          if (!isNaN(d.getTime())) {
            const sem = obtenerInicioSemana(d);
            const k = `${sem.getFullYear()}-${String(sem.getMonth() + 1).padStart(2, '0')}-${String(sem.getDate()).padStart(2, '0')}`;
            conteos.set(k, (conteos.get(k) || 0) + 1);
          }
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; cantidad: number }[] = [];
      const cur = obtenerInicioSemana(fechaInicio);
      const finSem = new Date(fechaFin);

      while (cur <= finSem) {
        const finS = new Date(cur);
        finS.setDate(finS.getDate() + 6);

        const anio = cur.getFullYear();
        const mes = String(cur.getMonth() + 1).padStart(2, '0');
        const dia = String(cur.getDate()).padStart(2, '0');
        const clave = `${anio}-${mes}-${dia}`;

        const diaF = String(finS.getDate()).padStart(2, '0');
        const mesF = String(finS.getMonth() + 1).padStart(2, '0');
        const anioF = finS.getFullYear();

        puntos.push({
          clave,
          etiqueta: `Sem ${dia}/${mes}`,
          etiquetaCompleta: `Semana del ${dia}/${mes} al ${diaF}/${mesF}/${anioF}`,
          cantidad: conteos.get(clave) || 0,
        });

        cur.setDate(cur.getDate() + 7);
      }
      return puntos;
    }

    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesesLargos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const conteos = new Map<string, number>();
    for (const inc of incidentesLista) {
      if (inc.creado_el && inc.creado_el.length >= 7) {
        const k = inc.creado_el.slice(0, 7);
        conteos.set(k, (conteos.get(k) || 0) + 1);
      }
    }

    const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; cantidad: number }[] = [];
    let curAnio = fechaInicio.getFullYear();
    let curMes = fechaInicio.getMonth();
    const finAnio = fechaFin.getFullYear();
    const finMes = fechaFin.getMonth();

    while (curAnio < finAnio || (curAnio === finAnio && curMes <= finMes)) {
      const clave = `${curAnio}-${String(curMes + 1).padStart(2, '0')}`;
      puntos.push({
        clave,
        etiqueta: `${mesesCortos[curMes]} ${String(curAnio).slice(-2)}`,
        etiquetaCompleta: `${mesesLargos[curMes]} de ${curAnio}`,
        cantidad: conteos.get(clave) || 0,
      });
      curMes++;
      if (curMes > 11) {
        curMes = 0;
        curAnio++;
      }
    }
    return puntos;
  }, [incidentesLista, desde, hasta, agrupacionTemporal]);

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

  const incidentesFiltrados = useMemo(() => {
    const term = busquedaIncidente.toLowerCase().trim();
    if (!term) return incidentesLista;
    return incidentesLista.filter((inc) => {
      const desc = (inc.descripcion || '').toLowerCase();
      const rep = (inc.nombre_reportante || '').toLowerCase();
      const leg = String(inc.reportado_por_id || '');
      const tipo = (inc.tipo && ETIQUETAS_TIPO[inc.tipo]) ? ETIQUETAS_TIPO[inc.tipo].toLowerCase() : (inc.tipo || '').toLowerCase();
      const estado = (ETIQUETAS_ESTADO[inc.estado] || inc.estado || '').toLowerCase();
      return (
        desc.includes(term) ||
        rep.includes(term) ||
        leg.includes(term) ||
        tipo.includes(term) ||
        estado.includes(term)
      );
    });
  }, [incidentesLista, busquedaIncidente]);

  const {
    itemsPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(incidentesFiltrados, 10);

  const exportarCSV = () => {
    if (incidentesFiltrados.length === 0) return;

    const cabeceras = [
      'ID',
      'Fecha',
      'Categoría',
      'Descripción',
      'Reportado Por',
      'Legajo',
      'Estado',
      'Resuelto Por',
      'Acción Correctiva',
    ];

    const filas = incidentesFiltrados.map((inc) => [
      inc.id,
      formatearFecha(inc.creado_el),
      `"${((inc.tipo && ETIQUETAS_TIPO[inc.tipo]) || inc.tipo || 'Otro').replace(/"/g, '""')}"`,
      `"${(inc.descripcion || '').replace(/"/g, '""')}"`,
      `"${(inc.nombre_reportante || '').replace(/"/g, '""')}"`,
      inc.reportado_por_id ?? '',
      `"${(ETIQUETAS_ESTADO[inc.estado] || inc.estado).replace(/"/g, '""')}"`,
      `"${(inc.nombre_resolutor || '').replace(/"/g, '""')}"`,
      `"${(inc.accion_correctiva || '').replace(/"/g, '""')}"`,
    ]);

    const contenidoCSV =
      '\uFEFF' + [cabeceras.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `incidentes_detallados_${formatearFechaInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modulo-container dashboard-vista-detalle">
      {onVolver && (
        <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
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
          <span className="dashboard-breadcrumb-actual">Incidentes Detallados</span>
        </nav>
      )}

      <div className="dashboard-vista-detalle-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
          <div>
            {onVolver && (
              <button type="button" className="dashboard-btn-volver" onClick={onVolver}>
                &larr; Volver al Dashboard
              </button>
            )}
            <h1 style={{ fontSize: '1.65rem', margin: '0.5rem 0 0.25rem 0', color: 'var(--text-h)' }}>
              Vista Detallada de Incidentes
            </h1>
            <div className="subtitulo" style={{ fontSize: '0.88rem', color: 'var(--color-texto-sec)' }}>
              Evolución temporal, análisis de recurrencia y categorización por tipo
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {incidentesFiltrados.length > 0 && (
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar a CSV
              </button>
            )}
          </div>
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
                  min="2000-01-01"
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
                  min={desde || '2000-01-01'}
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
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={() => aplicarAtajo(7)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                7 días
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={() => aplicarAtajo(30)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                30 días
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={aplicarAtajoAnio}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Este año
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={aplicarAtajoTodo}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Todo
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorRango && (
        <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
          {errorRango}
        </div>
      )}

      {errorStats && (
        <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
          {errorStats}
        </div>
      )}

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
              Total de Incidentes
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primario)', marginTop: '4px' }}>
              {kpis.total}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              registrados en el período
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Categoría Más Recurrente
            </span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {kpis.masFrecuente ? kpis.masFrecuente.nombre.split('/')[0].trim() : 'Sin incidentes'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              {kpis.masFrecuente ? `${kpis.masFrecuente.cantidad} incidentes (${kpis.masFrecuente.porcentaje}%)` : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Categorías Afectadas
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>
              {kpis.categoriasConIncidentes}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              con incidentes reportados
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Filtro Activo
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || 'var(--text-h)') : 'var(--text-h)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {categoriaSeleccionada ? (ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada) : 'Todas las categorías'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              {categoriaSeleccionada ? `${incidentesLista.length} incidentes filtrados` : 'clic en una barra para filtrar'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%' }}>
            <div>
              <CardTitle style={{ fontSize: '1rem' }}>Evolución Temporal de Incidentes</CardTitle>
              <CardDescription>
                {categoriaSeleccionada
                  ? `Frecuencia y distribución temporal de incidentes clasificados bajo ${ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada}.`
                  : 'Frecuencia cronológica de incidentes reportados a lo largo del período.'}
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Categoría:</label>
                <select
                  value={categoriaSeleccionada || ''}
                  onChange={(e) => setCategoriaSeleccionada((e.target.value as TipoIncidente) || null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '220px',
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {Object.entries(ETIQUETAS_TIPO).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
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
                {[
                  { id: 'dia', label: 'Día' },
                  { id: 'semana', label: 'Semana' },
                  { id: 'mes', label: 'Mes' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAgrupacionTemporal(tab.id as 'dia' | 'semana' | 'mes')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: agrupacionTemporal === tab.id ? 600 : 500,
                      backgroundColor: agrupacionTemporal === tab.id ? 'var(--color-superficie)' : 'transparent',
                      color: agrupacionTemporal === tab.id ? 'var(--text-h)' : 'var(--color-texto-sec)',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: agrupacionTemporal === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
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
                  onClick={() => setTipoGraficoEvolucion('lineas')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: tipoGraficoEvolucion === 'lineas' ? 600 : 500,
                    backgroundColor: tipoGraficoEvolucion === 'lineas' ? 'var(--color-superficie)' : 'transparent',
                    color: tipoGraficoEvolucion === 'lineas' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Gráfico de líneas"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                  Líneas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGraficoEvolucion('barras')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: tipoGraficoEvolucion === 'barras' ? 600 : 500,
                    backgroundColor: tipoGraficoEvolucion === 'barras' ? 'var(--color-superficie)' : 'transparent',
                    color: tipoGraficoEvolucion === 'barras' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
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
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '0 24px 20px 24px' }}>
          {cargandoIncidentes ? (
            <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando gráfico de evolución temporal...
            </div>
          ) : datosEvolucionTemporal.length === 0 || kpis.total === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin incidentes en el período</strong>
              <span>No se registraron incidentes para la serie temporal seleccionada.</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                {tipoGraficoEvolucion === 'lineas' ? (
                  <AreaChart data={datosEvolucionTemporal} margin={{ top: 12, right: 16, left: -10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="gradEvolucionIncidentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                      angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                      textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                      height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                        borderColor: 'var(--color-borde)',
                        borderRadius: '8px',
                        color: 'var(--color-texto)',
                      }}
                      formatter={(valor: any) => [
                        `${valor} ${valor === 1 ? 'incidente' : 'incidentes'}`,
                        categoriaSeleccionada ? (ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada) : 'Incidentes',
                      ]}
                      labelFormatter={(_, items) => items?.[0]?.payload?.etiquetaCompleta || ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="cantidad"
                      stroke={categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#gradEvolucionIncidentes)"
                      dot={{ r: 3.5, fill: categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario, strokeWidth: 2, stroke: 'var(--color-superficie)' }}
                      activeDot={{ r: 6, stroke: categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario, strokeWidth: 2, fill: 'var(--color-superficie)' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={datosEvolucionTemporal} margin={{ top: 12, right: 16, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                      angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                      textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                      height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                        borderColor: 'var(--color-borde)',
                        borderRadius: '8px',
                        color: 'var(--color-texto)',
                      }}
                      formatter={(valor: any) => [
                        `${valor} ${valor === 1 ? 'incidente' : 'incidentes'}`,
                        categoriaSeleccionada ? (ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada) : 'Incidentes',
                      ]}
                      labelFormatter={(_, items) => items?.[0]?.payload?.etiquetaCompleta || ''}
                    />
                    <Bar
                      dataKey="cantidad"
                      fill={categoriaSeleccionada ? (COLORES_TIPO[categoriaSeleccionada] || colores.primario) : colores.primario}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle style={{ fontSize: '1rem' }}>Distribución de Incidentes por Categoría</CardTitle>
                <CardDescription>Frecuencia de ocurrencia clasificada por tipología</CardDescription>
              </div>
              {categoriaSeleccionada && (
                <button
                  type="button"
                  className="btn-secundario"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => setCategoriaSeleccionada(null)}
                >
                  Restablecer selección
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cargandoStats ? (
              <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando gráfico...
              </div>
            ) : kpis.total === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin incidentes registrados</strong>
                <span>No se registraron incidentes en el período seleccionado.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico} margin={{ top: 12, right: 16, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="nombreCorto"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada)',
                        borderColor: 'var(--color-borde)',
                        color: 'var(--color-texto)',
                        borderRadius: '8px',
                      }}
                      formatter={(val, _, item) => [
                        `${val} ${val === 1 ? 'incidente' : 'incidentes'} (${item.payload.porcentaje}%)`,
                        item.payload.nombre,
                      ]}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '1rem' }}>Resumen por Categoría</CardTitle>
            <CardDescription>Desglose porcentual y selector rápido de filtrado</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {datosGrafico.map((item) => {
                const esActiva = categoriaSeleccionada === item.tipo;
                return (
                  <div
                    key={item.tipo}
                    onClick={() => setCategoriaSeleccionada((prev) => (prev === item.tipo ? null : item.tipo))}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${esActiva ? item.color : 'var(--color-borde)'}`,
                      backgroundColor: esActiva ? 'var(--color-suave)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Clic para filtrar incidentes por esta categoría"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: esActiva ? 700 : 500, color: 'var(--color-texto)' }}>{item.nombre}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
                        <strong>{item.cantidad}</strong> ({item.porcentaje}%)
                      </div>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--color-fondo)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.porcentaje}%`, backgroundColor: item.color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CardTitle style={{ fontSize: '1.1rem' }}>
                  {categoriaSeleccionada
                    ? `Detalle de Incidentes: ${ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada}`
                    : 'Listado Detallado de Incidentes'}
                </CardTitle>
                {categoriaSeleccionada && (
                  <Badge variant="outline" style={{ fontSize: '12px', borderColor: COLORES_TIPO[categoriaSeleccionada] || '#64748b' }}>
                    {incidentesFiltrados.length} {incidentesFiltrados.length === 1 ? 'registro' : 'registros'}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {categoriaSeleccionada
                  ? `Mostrando únicamente incidentes clasificados bajo ${ETIQUETAS_TIPO[categoriaSeleccionada] || categoriaSeleccionada}.`
                  : 'Registro granular de todos los incidentes reportados en el período.'}
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {categoriaSeleccionada && (
                <button
                  type="button"
                  className="btn-secundario"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setCategoriaSeleccionada(null)}
                >
                  ✕ Ver todas
                </button>
              )}
              <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
                <input
                  type="text"
                  placeholder="Buscar por descripción, operador..."
                  value={busquedaIncidente}
                  onChange={(e) => setBusquedaIncidente(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '7px 12px 7px 30px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-texto-sec)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent style={{ padding: 0 }}>
          {cargandoIncidentes ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando incidentes...
            </div>
          ) : errorIncidentes ? (
            <div className="alerta-error" style={{ margin: '1rem 20px' }}>
              {errorIncidentes}
            </div>
          ) : incidentesFiltrados.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>
                No se encontraron incidentes
              </strong>
              <p style={{ margin: 0, fontSize: '13px' }}>
                No hay registros que coincidan con los filtros y búsqueda aplicados.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px', width: '14%' }}>Fecha</th>
                    <th style={{ padding: '10px 14px', width: '16%' }}>Categoría</th>
                    <th style={{ padding: '10px 14px', width: '34%' }}>Descripción</th>
                    <th style={{ padding: '10px 14px', width: '16%' }}>Reportado Por</th>
                    <th style={{ padding: '10px 14px', width: '8%', textAlign: 'center' }}>Foto</th>
                    <th style={{ padding: '10px 14px', width: '12%', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPaginados.map((inc) => {
                    const f = formatearFecha(inc.creado_el);
                    const partes = f.includes(',') ? f.split(',') : [f, ''];
                    const dia = partes[0].trim();
                    const hora = partes[1]?.trim();

                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setIncidenteParaModal(inc)}
                        style={{ borderBottom: '1px solid var(--color-borde)', cursor: 'pointer' }}
                        className="fila-incidente-clickeable"
                        title="Clic para ver detalle completo del incidente"
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-texto)', fontSize: '12.5px' }}>{dia}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>{hora ? `${hora} hs · ` : ''}#{inc.id}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <EtiquetaCategoria nombre={(inc.tipo && ETIQUETAS_TIPO[inc.tipo]) || inc.tipo || 'Otro'} size="sm" />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div
                            title={inc.descripcion}
                            style={{
                              color: 'var(--color-texto)',
                              fontSize: '12.5px',
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
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-texto)', fontSize: '12.5px' }}>{inc.nombre_reportante || 'Operador'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>Legajo #{inc.reportado_por_id ?? '-'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <FotoMiniatura incidenteId={inc.id} descripcion={inc.descripcion} onClick={() => setIncidenteParaModal(inc)} />
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Badge variant={inc.estado === 'resuelto' || inc.estado === 'cerrado' ? 'al_dia' : inc.estado === 'en_revision' ? 'proximo' : 'vencido'}>
                            {ETIQUETAS_ESTADO[inc.estado] || inc.estado}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '12px 18px' }}>
            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              totalRegistros={totalRegistros}
              indiceInicio={indiceInicio}
              indiceFin={indiceFin}
              filasPorPagina={filasPorPagina}
              onCambiarPagina={setPaginaActual}
              onCambiarFilasPorPagina={setFilasPorPagina}
              etiqueta="incidentes"
            />
          </div>
        </CardContent>
      </Card>

      {incidenteParaModal && (
        <DetalleIncidenteModal
          incidente={incidenteParaModal}
          onClose={() => setIncidenteParaModal(null)}
          onEstadoActualizado={(actualizado: Incidente) => {
            setIncidentesLista((prev) =>
              prev.map((i) => (i.id === actualizado.id ? actualizado : i))
            );
            void cargarEstadisticas();
          }}
        />
      )}
    </div>
  );
};
