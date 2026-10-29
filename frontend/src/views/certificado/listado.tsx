import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import '../../styles/formularioAlta.css';

interface PersonalInfo {
  legajo: number;
  nombre: string;
  apellido: string;
}

interface ListadoCertificadosProps {
  onVerPersona?: (legajo: number, nombreCompleto: string) => void;
  onVerConsolidado?: () => void;
}

type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia';
type FiltroEstado = 'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoCertificados: React.FC<ListadoCertificadosProps> = ({
  onVerPersona,
  onVerConsolidado,
}) => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [personalMap, setPersonalMap] = useState<Record<number, PersonalInfo>>({});
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');

  const [modalArchivoUrl, setModalArchivoUrl] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resCerts, resPers] = await Promise.all([
          apiFetch('/certificados/'),
          apiFetch('/personal/'),
        ]);

        const dataCerts: Certificado[] = resCerts.ok ? await resCerts.json() : [];
        const dataPers: PersonalInfo[] = resPers.ok ? await resPers.json() : [];

        const dict: Record<number, PersonalInfo> = {};
        if (Array.isArray(dataPers)) {
          dataPers.forEach((p) => {
            dict[p.legajo] = p;
          });
        }
        setPersonalMap(dict);

        if (Array.isArray(dataCerts)) {
          const ordenados = [...dataCerts].sort((a, b) => {
            const dateA = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : Infinity;
            const dateB = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : Infinity;
            return dateA - dateB;
          });
          setCertificados(ordenados);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const d = new Date(fechaStr);
      return isNaN(d.getTime())
        ? fechaStr
        : d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
    } catch {
      return fechaStr;
    }
  };

  const calcularEstadoVencimiento = (fechaStr?: string | null): { estado: EstadoVencimiento; diffDias: number } => {
    if (!fechaStr) return { estado: 'al_dia', diffDias: 999 };
    const fechaLimite = new Date(fechaStr);
    const hoy = new Date();
    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) return { estado: 'vencido', diffDias };
    if (diffDias <= 15) return { estado: 'proximo', diffDias };
    return { estado: 'al_dia', diffDias };
  };

  const renderBotonArchivo = (fotoUrl?: string | null) => {
    if (!fotoUrl) {
      return <span style={{ color: 'var(--color-texto-sec)' }}>Sin archivo</span>;
    }

    const urlCompleta = fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
    const esPdf = fotoUrl.toLowerCase().endsWith('.pdf');

    return (
      <button
        type="button"
        onClick={() => setModalArchivoUrl(urlCompleta)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-primario-texto)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          fontSize: 'inherit',
        }}
        title="Ver evidencia"
      >
        <span>{esPdf ? 'Ver documento' : 'Ver imagen'}</span>
        <span>↗</span>
      </button>
    );
  };

  const certificadosFiltrados = certificados.filter((c) => {
    const { estado } = calcularEstadoVencimiento(c.fechaVencimiento);

    if (filtroEstado === 'VENCIDOS' && estado !== 'vencido') return false;
    if (filtroEstado === 'PROXIMOS' && estado !== 'proximo') return false;
    if (filtroEstado === 'AL_DIA' && estado !== 'al_dia') return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const persona = personalMap[c.legajo_persona];
    const nombrePersona = persona ? `${persona.nombre} ${persona.apellido}`.toLowerCase() : '';
    const legajoStr = String(c.legajo_persona);
    const tipoStr = c.tipo.toLowerCase();

    return (
      tipoStr.includes(term) ||
      nombrePersona.includes(term) ||
      legajoStr.includes(term)
    );
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (searchTerm.trim()) params.append('busqueda', searchTerm.trim());
      if (filtroEstado !== 'TODOS') params.append('filtro_estado', filtroEstado);

      const queryString = params.toString();
      const url = `/certificados/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'vencimientos_certificados.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al exportar los certificados a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (searchTerm.trim()) partes.push(`Búsqueda: "${searchTerm}"`);
    if (filtroEstado !== 'TODOS') partes.push(`Estado: ${filtroEstado}`);
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

  const {
    itemsPaginados: certificadosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(certificadosFiltrados);

  const resumen = {
    vencidos: certificadosFiltrados.filter((c) => calcularEstadoVencimiento(c.fechaVencimiento).estado === 'vencido').length,
    proximos: certificadosFiltrados.filter((c) => calcularEstadoVencimiento(c.fechaVencimiento).estado === 'proximo').length,
    vigentes: certificadosFiltrados.filter((c) => calcularEstadoVencimiento(c.fechaVencimiento).estado === 'al_dia').length,
  };

  const modalEsPdf = modalArchivoUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="modulo-container modulo-vencimientos-container">
      {/* Cabecera independiente de estilos de tabla para forzar orden vertical en la derecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Vencimientos de Personal</h1>
          <div className="subtitulo">01 · Control de carnets y certificados con archivo adjunto</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {onVerConsolidado && (
            <div className="venc-tabs">
              <button
                type="button"
                className="venc-tab"
                onClick={onVerConsolidado}
              >
                Todos (Consolidado)
              </button>
              <button
                type="button"
                className="venc-tab venc-tab--activo"
              >
                Solo Personal (con archivo)
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
        <span className="venc-chip venc-chip--vencido">● {resumen.vencidos} vencidos</span>
        <span className="venc-chip venc-chip--proximo">▲ {resumen.proximos} próximos</span>
        <span className="venc-chip venc-chip--vigente">✓ {resumen.vigentes} vigentes</span>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por empleado, legajo o tipo de certificado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDOS">Vencidos</option>
          <option value="PROXIMOS">Próximos a vencer (≤ 15 días)</option>
          <option value="AL_DIA">Al día</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom tabla-vencimientos">
          <thead>
            <tr>
              <th>Urgencia</th>
              <th>Vencimiento</th>
              <th>Personal</th>
              <th>Legajo</th>
              <th>Certificado</th>
              <th>Archivo</th>
              <th className="acciones-col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando vencimientos...
                </td>
              </tr>
            ) : certificadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron vencimientos para mostrar.
                </td>
              </tr>
            ) : (
              certificadosPaginados.map((item) => {
                const persona = personalMap[item.legajo_persona];
                const nombreCompleto = persona ? `${persona.apellido}, ${persona.nombre}` : '';
                const { estado, diffDias } = calcularEstadoVencimiento(item.fechaVencimiento);
                const claseFila = estado === 'al_dia' ? 'vigente' : estado;

                return (
                  <tr key={item.id} className={`venc-fila--${claseFila}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {estado === 'vencido' && (
                        <span className="venc-badge venc-badge--vencido">
                          ● Vencido ({Math.abs(diffDias)} d)
                        </span>
                      )}

                      {estado === 'proximo' && (
                        <span className="venc-badge venc-badge--proximo">
                          ▲ Vence en {diffDias} días
                        </span>
                      )}

                      {estado === 'al_dia' && (
                        <span className="venc-badge venc-badge--vigente">
                          ✓ Al día
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong>{formatearFecha(item.fechaVencimiento)}</strong>
                    </td>
                    <td>
                      {nombreCompleto ? (
                        <strong>{nombreCompleto}</strong>
                      ) : (
                        <span style={{ color: 'var(--color-texto-sec)' }}>Cargando...</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>#{item.legajo_persona}</td>
                    <td>{item.tipo}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{renderBotonArchivo(item.foto_url)}</td>
                    <td className="acciones-col">
                      <button
                        type="button"
                        className="btn-guardar btn-gestionar-venc"
                        title="Gestionar en el perfil de la persona"
                        onClick={() => {
                          if (onVerPersona) {
                            onVerPersona(item.legajo_persona, nombreCompleto);
                          } else {
                            window.location.hash = `#/personal`;
                          }
                        }}
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
        etiqueta="certificados"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={certificadosFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <Dialog open={Boolean(modalArchivoUrl)} onOpenChange={(open) => !open && setModalArchivoUrl(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Archivo adjunto</DialogTitle>
          </DialogHeader>
          {modalArchivoUrl && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '70vh',
                overflow: 'hidden',
                borderRadius: '8px',
                border: '1px solid var(--color-borde)',
              }}
            >
              {modalEsPdf ? (
                <iframe
                  src={modalArchivoUrl}
                  title="Documento adjunto"
                  style={{
                    width: '100%',
                    height: '65vh',
                    border: 'none',
                  }}
                />
              ) : (
                <img
                  src={modalArchivoUrl}
                  alt="Comprobante de certificado"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose onClick={() => setModalArchivoUrl(null)}>Cerrar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListadoCertificados;