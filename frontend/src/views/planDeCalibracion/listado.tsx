import { useState, useEffect } from 'react';
import '../../styles/formularioAlta.css';
import type { PlanDeCalibracionConId } from './tipos';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import { Badge } from '../../components/ui/badge';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import RegistrarCalibracion from '../calibracion_Realizada/registrarCalibracion';

interface ListadoPlanesCProps {
  onNuevoClick?: () => void;
  onDetalleClick?: (id: number) => void;
  onEditarClick?: (id: number) => void;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'No aplica';
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

export const ListadoPlanesCalibracion: React.FC<ListadoPlanesCProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [planes, setPlanes] = useState<PlanDeCalibracionConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [calibracionSselecionada, setCalibracionSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch('/plan_de_calibracion/');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setPlanes(data);
        } else {
          if (!ignore) setPlanes([]);
        }
      } catch {
        if (!ignore) setPlanes([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia' | 'sin_fecha';

  const calcularEstadoVencimiento = (fechavencimientoStr?: string | null): EstadoVencimiento => {
    if (!fechavencimientoStr) return 'sin_fecha';

    const fechaLimite = new Date(fechavencimientoStr);
    const hoy = new Date();

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
      return 'vencido';
    } else if (diffDias <= 2) {
      return 'proximo';
    }

    return 'al_dia';
  };

  const planesCFiltrados = planes.filter((p) => {
    const term = busqueda.toLowerCase().trim();
    const coincideBusqueda =
      !term ||
      (p.nombre?.toLowerCase().includes(term) ?? false) ||
      (p.nombre_equipo?.toLowerCase().includes(term) ?? false);
    const coincideVencimiento =
      !term || (p.fecha_vencimiento?.toLowerCase().includes(term) ?? false);
    return coincideBusqueda || coincideVencimiento;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (busqueda.trim()) params.append('busqueda', busqueda.trim());

      const queryString = params.toString();
      const url = `/plan_de_calibracion/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'planes_de_calibracion.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al exportar los planes de calibración a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    return busqueda.trim() ? `Búsqueda: "${busqueda}"` : 'Sin filtros aplicados';
  };

  const {
    itemsPaginados: planesPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(planesCFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Planes de Calibración</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CsvIcon /> Exportar CSV
          </button>

          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Crear Plan
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por plan o equipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Equipo</th>
              <th>Fecha de Mantenimiento</th>
              <th>Fecha de Vencimiento</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Planes...
                </td>
              </tr>
            ) : planesCFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron planes de calibración que coincidan con los filtros.'
                    : 'No hay planes registrados.'}
                </td>
              </tr>
            ) : (
              planesPaginados.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td>{p.nombre_equipo}</td>
                  <td>{formatDate(p.fecha_mantenimiento)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{formatDate(p.fecha_vencimiento)}</span>

                      {calcularEstadoVencimiento(p.fecha_vencimiento) === 'vencido' && (
                        <Badge variant="vencido" title="El elemento ha superado la fecha límite">
                          ● Vencido
                        </Badge>
                      )}

                      {calcularEstadoVencimiento(p.fecha_vencimiento) === 'proximo' && (
                        <Badge variant="proximo" title="Quedan 2 días o menos para el recambio">
                          ▲ Próximo a vencer
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <div className="acciones-btns">
                        <button
                          type="button"
                          className="btn-icon btn-reactivar"
                          title="marcar como realizada"
                          onClick={() => {
                            setModalAbierto(true);
                            setCalibracionSeleccionada(p?.id ?? null);
                          }}
                        >
                          ↻
                        </button>
                      </div>
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick?.(p.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(p.id)}
                      >
                        ✎
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
        etiqueta="planes de calibración"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={planesCFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      {modalAbierto && (
        <div className="modal-abierto">
          <div className="modal-content">
            <RegistrarCalibracion
              planID={calibracionSselecionada}
              onSuccess={() => setModalAbierto(false)}
              onCancel={() => setModalAbierto(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};