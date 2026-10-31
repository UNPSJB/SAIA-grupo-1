import React, { useEffect, useMemo, useState } from 'react';
import type { DocumentoListItem, TipoDocumento } from './tipos';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import '../../styles/formularioAlta.css';
import './documentos.css';

type FiltroEstado = 'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA';
type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia';

interface VencimientosDocumentosProps {
  onVerDocumento?: (id: number) => void;
  onVerConsolidado?: () => void;
  onVerSoloPersonal?: () => void;
  filtroEstadoInicial?: FiltroEstado;
}

const getTipoLabel = (tipo?: TipoDocumento | null): string => tipo || "";

const formatearFecha = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
  } catch {
    return dateStr;
  }
};

export const VencimientosDocumentos: React.FC<VencimientosDocumentosProps> = ({
  onVerDocumento,
  onVerConsolidado,
  onVerSoloPersonal,
  filtroEstadoInicial,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(filtroEstadoInicial || 'TODOS');

  useEffect(() => {
    let cancelado = false;
    const cargarDatos = async () => {
      try {
        const res = await apiFetch('/documentos');
        if (!cancelado && res.ok) {
          const data: DocumentoListItem[] = await res.json();
          setDocumentos(data);
        } else if (!cancelado) {
          setDocumentos([]);
        }
      } catch {
        if (!cancelado) setDocumentos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarDatos();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleDescargar = async (versionId?: number | null, nombreArchivo?: string | null) => {
    if (!versionId) return;
    try {
      const res = await apiFetch(`/documentos/archivo/${versionId}`);
      if (!res.ok) throw new Error('No se pudo descargar el archivo.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el archivo.');
    }
  };

  const calcularPlazo = (doc: DocumentoListItem): { estado: EstadoVencimiento; diffDias: number } => {
    const fechaStr = doc.fecha_vencimiento;
    if (!fechaStr) {
      return { estado: 'al_dia', diffDias: 999999 };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaV = new Date(fechaStr);
    if (isNaN(fechaV.getTime())) {
      // Fallback si la cadena tiene formato YYYY-MM-DD
      const partes = fechaStr.slice(0, 10).split('-').map(Number);
      if (partes.length === 3) {
        fechaV.setFullYear(partes[0], partes[1] - 1, partes[2]);
      }
    }
    fechaV.setHours(0, 0, 0, 0);

    const diffMs = fechaV.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { estado: 'vencido', diffDias };
    }
    if (diffDias < 15) {
      return { estado: 'proximo', diffDias };
    }
    return { estado: 'al_dia', diffDias };
  };

  const documentosConPlazo = useMemo(() => {
    return documentos.map((doc) => {
      const { estado, diffDias } = calcularPlazo(doc);
      return { doc, estado, diffDias };
    });
  }, [documentos]);

  const nombresTipos = useMemo(() => {
    return Array.from(
      new Set(documentos.map((d) => getTipoLabel(d.tipo)))
    ).filter(Boolean);
  }, [documentos]);

  const resumen = useMemo(() => {
    let vencidos = 0;
    let proximos = 0;
    let vigentes = 0;
    for (const item of documentosConPlazo) {
      if (item.estado === 'vencido') vencidos++;
      else if (item.estado === 'proximo') proximos++;
      else vigentes++;
    }
    return { vencidos, proximos, vigentes };
  }, [documentosConPlazo]);

  const documentosFiltrados = useMemo(() => {
    return documentosConPlazo
      .filter(({ doc, estado }) => {
        if (filtroTipo !== 'TODOS' && doc.tipo !== filtroTipo && getTipoLabel(doc.tipo) !== filtroTipo) {
          return false;
        }

        if (filtroEstado === 'VENCIDOS' && estado !== 'vencido') return false;
        if (filtroEstado === 'PROXIMOS' && estado !== 'proximo') return false;
        if (filtroEstado === 'AL_DIA' && estado !== 'al_dia') return false;

        if (busqueda.trim()) {
          const term = busqueda.toLowerCase().trim();
          const matchTitulo = doc.titulo.toLowerCase().includes(term);
          const matchTipoDesc = getTipoLabel(doc.tipo).toLowerCase().includes(term);
          const matchUsuario = (doc.usuario ?? '').toLowerCase().includes(term);
          if (!matchTitulo && !matchTipoDesc && !matchUsuario) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pesoEstado = (est: EstadoVencimiento) => (est === 'vencido' ? 0 : est === 'proximo' ? 1 : 2);
        const diffPeso = pesoEstado(a.estado) - pesoEstado(b.estado);
        if (diffPeso !== 0) return diffPeso;
        return a.diffDias - b.diffDias;
      });
  }, [documentosConPlazo, filtroTipo, filtroEstado, busqueda]);

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (busqueda.trim()) params.append("busqueda", busqueda.trim());
      if (filtroTipo !== "TODOS") params.append("tipo", filtroTipo);
      if (filtroEstado !== "TODOS") params.append("filtro_estado", filtroEstado);

      const queryString = params.toString();
      // LLAMADA AL ENDPOINT EXCLUSIVO DE VENCIMIENTOS
      const url = `/documentos/vencimientos/exportar-csv${queryString ? `?${queryString}` : ""}`;

      await descargarCSV(url, "vencimientos_documentos.csv");
      setDialogExportarAbierto(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al exportar vencimientos a CSV.");
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda}"`);
    if (filtroTipo !== "TODOS") partes.push(`Tipo: ${filtroTipo}`);
    if (filtroEstado !== "TODOS") partes.push(`Estado: ${filtroEstado}`);
    return partes.length > 0 ? partes.join(" | ") : "Sin filtros aplicados";
  };

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
  } = usePaginacion(documentosFiltrados);

  return (
    <div className="modulo-container modulo-vencimientos-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Vencimientos de Documentos</h1>
          <div className="subtitulo">01 · Control de vigencia y fechas de caducidad documental</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {(onVerConsolidado || onVerSoloPersonal) && (
            <div className="venc-tabs">
              {onVerConsolidado && (
                <button
                  type="button"
                  className="venc-tab"
                  onClick={onVerConsolidado}
                >
                  Todos (Consolidado)
                </button>
              )}
              {onVerSoloPersonal && (
                <button
                  type="button"
                  className="venc-tab"
                  onClick={onVerSoloPersonal}
                >
                  Solo Personal (con archivo)
                </button>
              )}
              <button
                type="button"
                className="venc-tab venc-tab--activo"
              >
                Solo Documentos
              </button>
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
        <span
          className={`venc-chip venc-chip--vencido ${filtroEstado === 'VENCIDOS' ? 'activo' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFiltroEstado((prev) => (prev === 'VENCIDOS' ? 'TODOS' : 'VENCIDOS'))}
        >
          ● {resumen.vencidos} vencidos
        </span>
        <span
          className={`venc-chip venc-chip--proximo ${filtroEstado === 'PROXIMOS' ? 'activo' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFiltroEstado((prev) => (prev === 'PROXIMOS' ? 'TODOS' : 'PROXIMOS'))}
        >
          ▲ {resumen.proximos} próximos
        </span>
        <span
          className={`venc-chip venc-chip--vigente ${filtroEstado === 'AL_DIA' ? 'activo' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFiltroEstado((prev) => (prev === 'AL_DIA' ? 'TODOS' : 'AL_DIA'))}
        >
          ✓ {resumen.vigentes} al día
        </span>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por documento o tipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="TODOS">Todos los tipos</option>
          {nombresTipos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDOS">Vencidos</option>
          <option value="PROXIMOS">Próximos a vencer (&lt; 15 días)</option>
          <option value="AL_DIA">Al día</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom tabla-vencimientos">
          <thead>
            <tr>
              <th>Urgencia</th>
              <th>Vencimiento</th>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Versión</th>
              <th>Archivo</th>
              <th className="acciones-col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando vencimientos de documentos...
                </td>
              </tr>
            ) : documentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron vencimientos para mostrar.
                </td>
              </tr>
            ) : (
              itemsPaginados.map(({ doc, estado, diffDias }) => {
                const claseFila = estado === 'al_dia' ? 'vigente' : estado;
                return (
                  <tr key={doc.id} className={`venc-fila--${claseFila}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {estado === 'vencido' && (
                        <span className="venc-badge venc-badge--vencido">
                          ● Vencido {diffDias < 0 ? `(${Math.abs(diffDias)} d)` : ''}
                        </span>
                      )}
                      {estado === 'proximo' && (
                        <span className="venc-badge venc-badge--proximo">
                          ▲ Vence en {diffDias} {diffDias === 1 ? 'día' : 'días'}
                        </span>
                      )}
                      {estado === 'al_dia' && (
                        <span className="venc-badge venc-badge--vigente">
                          ✓ Al día
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong>{doc.fecha_vencimiento ? formatearFecha(doc.fecha_vencimiento) : 'Sin vencimiento'}</strong>
                    </td>
                    <td>
                      <strong>{doc.titulo}</strong>
                    </td>
                    <td>{getTipoLabel(doc.tipo)}</td>
                    <td>
                      {doc.es_vigente ? (
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--color-exito-texto)',
                          backgroundColor: 'var(--color-exito-bg)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          v{doc.version_actual ?? 1} Vigente
                        </span>
                      ) : (
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--color-peligro-texto, #991b1b)',
                          backgroundColor: 'var(--color-peligro-bg, #fee2e2)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          Sin versión vigente
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {doc.version_actual_id ? (
                        <button
                          type="button"
                          className="btn-icon btn-descargar"
                          title="Descargar archivo"
                          onClick={() => handleDescargar(doc.version_actual_id, doc.archivo_nombre_original)}
                        >
                          ⬇ PDF
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="acciones-col">
                      <button
                        type="button"
                        className="btn-guardar btn-gestionar-venc"
                        title="Ver detalles del documento"
                        onClick={() => onVerDocumento?.(doc.id)}
                      >
                        Gestionar ↗
                      </button>
                    </td>
                  </tr>
                );
              })
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
        etiqueta="documentos"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={documentosFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};