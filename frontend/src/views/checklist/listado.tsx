import React, { useEffect, useState } from 'react';
import type { Checklist, PersonalResumen } from './tipos';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';

interface ListadoChecklistsProps {
  onDetalleClick: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const obtenerFechaLocalHoy = (): string => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export const ListadoChecklists: React.FC<ListadoChecklistsProps> = ({
  onDetalleClick,
}) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  const [personal, setPersonal] = useState<PersonalResumen[]>([]);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [responsableLegajo, setResponsableLegajo] = useState<number | ''>('');
  const [generando, setGenerando] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [checklistHoyId, setChecklistHoyId] = useState<number | null>(null);

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const mostrarError = (mensaje: string, titulo: string = 'Atención') => {
    setErrorDialog({
      open: true,
      title: titulo,
      message: mensaje,
    });
  };

  const recargarChecklists = async (
    desde: string = fechaDesde,
    hasta: string = fechaHasta,
    estado: string = estadoFiltro
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append('fecha_desde', desde);
      if (hasta) params.append('fecha_hasta', hasta);
      if (estado) params.append('estado', estado);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_URL}/checklist/${query}`);
      if (res.ok) {
        const data = await res.json();
        setChecklists(data);
      } else {
        const err = await res.json();
        mostrarError(err.detail || 'No se pudieron filtrar las checklists.');
        setChecklists([]);
      }
    } catch {
      setChecklists([]);
      mostrarError('No se pudo conectar con el servidor para cargar las checklists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;

    const cargarDatos = async () => {
      try {
        const [resChecklists, resPersonal] = await Promise.all([
          fetch(`${API_URL}/checklist/`),
          fetch(`${API_URL}/personal/`),
        ]);

        if (!cancelado) {
          if (resChecklists.ok) {
            const data: Checklist[] = await resChecklists.json();
            setChecklists(data);
            const hoyIso = obtenerFechaLocalHoy();
            const encontrado = data.find((c) => c.fecha === hoyIso);
            if (encontrado) {
              setChecklistHoyId(encontrado.id);
            }
          } else {
            setChecklists([]);
          }

          if (resPersonal.ok) {
            const dataPersonal: PersonalResumen[] = await resPersonal.json();
            setPersonal(dataPersonal.filter((p) => p.activo));
          }
        }
      } catch {
        if (!cancelado) {
          setChecklists([]);
          mostrarError('No se pudo conectar con el servidor para cargar las checklists.');
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, []);

  const hoy = obtenerFechaLocalHoy();

  const handleFiltrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      mostrarError("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.", "Rango de fechas inválido");
      return;
    }
    await recargarChecklists(fechaDesde, fechaHasta, estadoFiltro);
  };

  const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoEstado = e.target.value;
    setEstadoFiltro(nuevoEstado);
    if (!(fechaDesde && fechaHasta && fechaDesde > fechaHasta)) {
      await recargarChecklists(fechaDesde, fechaHasta, nuevoEstado);
    }
  };

  const handleLimpiarFiltro = async () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('');
    await recargarChecklists('', '', '');
  };

  const handleGenerarChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsableLegajo) {
      mostrarError('Debe seleccionar un responsable válido para generar el checklist.', 'Dato requerido');
      return;
    }

    setGenerando(true);
    try {
      const res = await fetch(`${API_URL}/checklist/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsable_legajo: Number(responsableLegajo),
        }),
      });

      if (res.ok) {
        const nueva = await res.json();
        setModalGenerar(false);
        setResponsableLegajo('');
        setChecklistHoyId(nueva.id);
        await recargarChecklists();
        onDetalleClick(nueva.id);
      } else {
        const err = await res.json();
        const detalle =
          typeof err.detail === 'string'
            ? err.detail
            : Array.isArray(err.detail)
            ? err.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ')
            : 'Error al generar el checklist del día.';
        mostrarError(detalle, 'No se pudo generar');
      }
    } catch {
      mostrarError('Error de red al intentar generar el checklist.', 'Error de conexión');
    } finally {
      setGenerando(false);
    }
  };


  return (
    <div className="checklist-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Historial de Checklists</h1>
          <div className="subtitulo">01 · Historial y Seguimiento</div>
        </div>

        <div className="top-bar-acciones">
          {checklistHoyId ? (
            <button
              onClick={() => onDetalleClick(checklistHoyId)}
              className="btn-dia-ver"
              title="Abrir el checklist generado para el día de hoy"
            >
              📅 Ver Checklist del Día
            </button>
          ) : (
            <button
              onClick={() => setModalGenerar(true)}
              className="btn-guardar"
              title="Generar checklist para las tareas de hoy"
            >
              + Generar Checklist del Día
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleFiltrar} className="filtros-historial">
        <div className="filtros-rango-campos">
          <div className="filtro-campo-grupo">
            <label htmlFor="fecha-desde">Desde:</label>
            <input
              id="fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="filtro-campo-grupo">
            <label htmlFor="fecha-hasta">Hasta:</label>
            <input
              id="fecha-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <div className="filtro-campo-grupo">
            <label htmlFor="filtro-estado">Estado:</label>
            <select
              id="filtro-estado"
              value={estadoFiltro}
              onChange={handleEstadoChange}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
        </div>

        <div className="filtros-acciones">
          <button type="submit" className="btn-filtrar" title="Filtrar historial">
            🔍 Filtrar
          </button>
          {(fechaDesde || fechaHasta || estadoFiltro) && (
            <button
              type="button"
              onClick={handleLimpiarFiltro}
              className="btn-limpiar-filtro"
              title="Limpiar filtros"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Cumplimiento</th>
              <th>Responsable</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Cargando historial de checklists...
                </td>
              </tr>
            ) : checklists.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  {fechaDesde || fechaHasta || estadoFiltro
                    ? 'No se encontraron checklists registrados con los filtros seleccionados.'
                    : 'No se encontraron checklists registrados.'}
                </td>
              </tr>
            ) : (
              checklists.map((c) => {
                const fillClass =
                  c.porcentaje_cumplimiento === 100
                    ? ''
                    : c.porcentaje_cumplimiento > 0
                    ? 'parcial'
                    : 'vacio';

                return (
                  <tr key={c.id}>
                    <td>
                      <strong>#{c.id}</strong>
                    </td>
                    <td>{c.fecha}</td>
                    <td>
                      <span className={`badge-estado ${c.estado}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td>
                      <div className="barra-progreso-wrapper">
                        <div className="barra-progreso-track">
                          <div
                            className={`barra-progreso-fill ${fillClass}`}
                            style={{ width: `${c.porcentaje_cumplimiento}%` }}
                          />
                        </div>
                        <span className="barra-progreso-texto">
                          {c.porcentaje_cumplimiento}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {c.nombre_responsable || `Legajo: ${c.responsable_legajo}`}
                    </td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          className="btn-icon btn-ver"
                          title="Ver detalle del checklist"
                          onClick={() => onDetalleClick(c.id)}
                        >
                          👁
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalGenerar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Generar Checklist del Día</h2>
              <p>Fecha programada: <strong>{hoy}</strong></p>
            </div>

            <form onSubmit={handleGenerarChecklist}>
              <div className="form-group">
                <label htmlFor="responsable">Responsable de la Checklist *</label>
                <select
                  id="responsable"
                  value={responsableLegajo}
                  onChange={(e) =>
                    setResponsableLegajo(
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                  required
                >
                  <option value="">-- Seleccione una persona activa --</option>
                  {personal.map((p) => (
                    <option key={p.legajo} value={p.legajo}>
                      {p.apellido}, {p.nombre} (Legajo: {p.legajo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-acciones">
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={generando || !responsableLegajo}
                >
                  {generando ? 'Generando...' : 'Generar Checklist'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setModalGenerar(false);
                    setResponsableLegajo('');
                  }}
                  disabled={generando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ErrorAlertDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog((prev) => ({ ...prev, open: false }))}
        title={errorDialog.title}
        description={errorDialog.message}
      />
    </div>
  );
};
