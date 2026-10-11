import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import '../../styles/formularioAlta.css';

export type OrigenVencimiento = 'personal' | 'equipo' | 'documento';
export type EstadoVencimiento = 'vencido' | 'proximo' | 'vigente';

export interface VencimientoFila {
  id: string;
  origen: OrigenVencimiento;
  concepto: string;
  responsable: string;
  referenciaId: number;
  fecha: string;
  diasRestantes: number;
  estado: EstadoVencimiento;
}

interface VencimientoApi {
  id: string;
  origen: OrigenVencimiento;
  concepto: string;
  responsable: string;
  referencia_id: number;
  fecha: string;
  dias_restantes: number;
  estado: EstadoVencimiento;
}

interface Props {
  onIrAlRegistro: (vencimiento: VencimientoFila) => void;
  onVerSoloPersonal?: () => void;
}

const ETIQUETA_ORIGEN: Record<OrigenVencimiento, string> = {
  personal: 'Personal',
  equipo: 'Calibración / Mantenimiento',
  documento: 'Documentos',
};

const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
  vencido: '● Vencido',
  proximo: '▲ Próximo a vencer',
  vigente: '✓ Vigente',
};

const formatearFecha = (fecha: string): string => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

const describirPlazo = (dias: number): string => {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export const VistaConsolidadaVencimiento: React.FC<Props> = ({
  onIrAlRegistro,
  onVerSoloPersonal,
}) => {
  const [filas, setFilas] = useState<VencimientoFila[]>([]);
  const [filtro, setFiltro] = useState<'' | OrigenVencimiento>('');
  const [filtroEstado, setFiltroEstado] = useState<'' | EstadoVencimiento>('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filtro) params.set('origen', filtro);
        const sufijo = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/vencimientos/${sufijo}`);
        if (!res.ok) {
          throw new Error('No se pudieron cargar los vencimientos consolidados.');
        }
        const data: VencimientoApi[] = await res.json();
        if (cancelado) return;

        setFilas(
          data.map((d) => ({
            id: d.id,
            origen: d.origen,
            concepto: d.concepto,
            responsable: d.responsable,
            referenciaId: d.referencia_id,
            fecha: d.fecha,
            diasRestantes: d.dias_restantes,
            estado: d.estado,
          }))
        );
      } catch (err: any) {
        if (!cancelado) {
          setError(err?.message || 'Error al cargar los vencimientos.');
          setFilas([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [filtro]);

  const filasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!filtro || f.origen === filtro) &&
        (!filtroEstado || f.estado === filtroEstado) &&
        (!termino || `${f.concepto} ${f.responsable}`.toLowerCase().includes(termino))
    );
  }, [filas, filtro, filtroEstado, busqueda]);

  const resumen = useMemo(
    () => ({
      vencidos: filasVisibles.filter((f) => f.estado === 'vencido').length,
      proximos: filasVisibles.filter((f) => f.estado === 'proximo').length,
      vigentes: filasVisibles.filter((f) => f.estado === 'vigente').length,
    }),
    [filasVisibles]
  );

  const {
    itemsPaginados: filasPaginadas,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(filasVisibles);

  return (
    <div className="modulo-container">
      <style>{ESTILOS}</style>

      <div className="listado-top-bar" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1 style={{ margin: 0 }}>Vencimientos</h1>
        </div>

        {onVerSoloPersonal && (
          <div className="venc-tabs">
            <button type="button" className="venc-tab venc-tab--activo">
              Todos (Consolidado)
            </button>
            <button
              type="button"
              className="venc-tab"
              onClick={onVerSoloPersonal}
            >
              Solo Personal (con archivo)
            </button>
          </div>
        )}
      </div>

      <div className="venc-resumen">
        <span className="venc-chip venc-chip--vencido">● {resumen.vencidos} vencidos</span>
        <span className="venc-chip venc-chip--proximo">▲ {resumen.proximos} próximos</span>
        <span className="venc-chip venc-chip--vigente">✓ {resumen.vigentes} vigentes</span>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por persona, equipo, documento o concepto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="select-filtro"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as '' | OrigenVencimiento)}
          aria-label="Filtrar por tipo de vencimiento"
        >
          <option value="">Todos los tipos</option>
          <option value="personal">{ETIQUETA_ORIGEN.personal}</option>
          <option value="equipo">{ETIQUETA_ORIGEN.equipo}</option>
          <option value="documento">{ETIQUETA_ORIGEN.documento}</option>
        </select>
        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as '' | EstadoVencimiento)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="vencido">Vencido</option>
          <option value="proximo">Próximo a vencer</option>
          <option value="vigente">Vigente</option>
        </select>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Qué vence</th>
              <th>Responsable / Entidad</th>
              <th>Fecha de vencimiento</th>
              <th>Plazo</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando vencimientos...
                </td>
              </tr>
            ) : filasVisibles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay vencimientos para mostrar con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filasPaginadas.map((f) => (
                <tr key={f.id} className={`venc-fila--${f.estado}`}>
                  <td>
                    <span className={`venc-badge venc-badge--${f.estado}`}>
                      {ETIQUETA_ESTADO[f.estado]}
                    </span>
                  </td>
                  <td>{ETIQUETA_ORIGEN[f.origen]}</td>
                  <td>
                    <strong>{f.concepto}</strong>
                  </td>
                  <td>{f.responsable}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{describirPlazo(f.diasRestantes)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ir al registro"
                        onClick={() => onIrAlRegistro(f)}
                      >
                        👁
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="vencimientos"
      />
    </div>
  );
};

const ESTILOS = `
.venc-resumen { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.venc-chip { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; }
.venc-chip--vencido, .venc-badge--vencido { background-color: #fee2e2; color: #dc2626; border-color: #f87171; }
.venc-chip--proximo, .venc-badge--proximo { background-color: #fef3c7; color: #b45309; border-color: #fcd34d; }
.venc-chip--vigente, .venc-badge--vigente { background-color: #dcfce7; color: #15803d; border-color: #86efac; }
.venc-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; border: 1px solid transparent; white-space: nowrap; }
.venc-fila--vencido td:first-child { box-shadow: inset 4px 0 0 #dc2626; }
.venc-fila--proximo td:first-child { box-shadow: inset 4px 0 0 #f59e0b; }
.venc-fila--vigente td:first-child { box-shadow: inset 4px 0 0 #22c55e; }
.venc-nota { color: #6b7280; font-size: 0.85rem; margin: 0 0 1rem; }
.venc-tabs { display: inline-flex; background: #f1f5f9; padding: 4px; border-radius: 8px; gap: 4px; }
.venc-tab { border: none; background: transparent; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s ease; }
.venc-tab--activo { background: #1e293b; color: #ffffff; }
`;