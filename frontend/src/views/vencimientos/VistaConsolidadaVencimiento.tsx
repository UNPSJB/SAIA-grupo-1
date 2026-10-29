import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
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
  onVerSoloDocumentos?: () => void;
  filtroOrigenInicial?: '' | OrigenVencimiento;
  filtroEstadoInicial?: '' | EstadoVencimiento;
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
  onVerSoloDocumentos,
  filtroOrigenInicial,
  filtroEstadoInicial,
}) => {
  const [filas, setFilas] = useState<VencimientoFila[]>([]);
  const [filtro, setFiltro] = useState<'' | OrigenVencimiento>(filtroOrigenInicial || '');
  const [filtroEstado, setFiltroEstado] = useState<'' | EstadoVencimiento>(filtroEstadoInicial || '');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);
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
      } catch (err: unknown) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'Error al cargar los vencimientos.');
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

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (filtro) params.append('origen', filtro);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda.trim()) params.append('q', busqueda.trim());

      const queryString = params.toString();
      const url = `/vencimientos/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'vencimientos_consolidados.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al exportar los vencimientos consolidados a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (filtro) partes.push(`Origen: ${ETIQUETA_ORIGEN[filtro]}`);
    if (filtroEstado) partes.push(`Estado: ${ETIQUETA_ESTADO[filtroEstado]}`);
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda}"`);
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

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
    <div className="modulo-container modulo-vencimientos-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Vencimientos</h1>
          <div className="subtitulo">01 · Control consolidado de carnets, calibraciones y documentos</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {(onVerSoloPersonal || onVerSoloDocumentos) && (
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
            {onVerSoloDocumentos && (
              <button
                type="button"
                className="venc-tab"
                onClick={onVerSoloDocumentos}
              >
                Solo Documentos
              </button>
            )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CsvIcon /> Exportar CSV
          </button>
        </div>
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
        <table className="tabla-custom tabla-vencimientos">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Qué vence</th>
              <th>Responsable / Entidad</th>
              <th>Vencimiento</th>
              <th>Plazo</th>
              <th className="acciones-col">Acción</th>
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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={`venc-badge venc-badge--${f.estado}`}>
                      {ETIQUETA_ESTADO[f.estado]}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ETIQUETA_ORIGEN[f.origen]}</td>
                  <td>
                    <strong>{f.concepto}</strong>
                  </td>
                  <td>{f.responsable}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <strong>{formatearFecha(f.fecha)}</strong>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{describirPlazo(f.diasRestantes)}</td>
                  <td className="acciones-col">
                    <button
                      type="button"
                      className="btn-guardar btn-gestionar-venc"
                      title="Gestionar registro"
                      onClick={() => onIrAlRegistro(f)}
                    >
                      Gestionar ↗
                    </button>
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

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={filasVisibles.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};