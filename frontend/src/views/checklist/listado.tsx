import React, { useEffect, useState } from 'react';
import type { Checklist, PersonalResumen } from './tipos';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';

interface ListadoChecklistsProps {
  onDetalleClick: (id: number) => void;
  onTareasNoRealizadasClick?: () => void;
}
const obtenerFechaLocalHoy = (): string => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearMotivo = (motivo?: string | null): string => {
  if (!motivo) return '';
  switch (motivo) {
    case 'equipo_fuera_de_uso':
      return 'Equipo fuera de uso';
    case 'falta_de_insumo':
      return 'Falta de insumo';
    case 'otro':
      return 'Otro';
    default:
      return motivo;
  }
};

export const ListadoChecklists: React.FC<ListadoChecklistsProps> = ({
  onDetalleClick,
  onTareasNoRealizadasClick,
}) => {
  // El administrador ve los checklists de todos; cada operador genera y ve solo los suyos.
  const { esAdministrador, esOperador, usuario } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  // operadores para el filtro del administrador
  const [personal, setPersonal] = useState<PersonalResumen[]>([]);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [generando, setGenerando] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');
  const [checklistHoyId, setChecklistHoyId] = useState<number | null>(null);
  const [checklistExpandido, setChecklistExpandido] = useState<number | null>(null);
  // el operador solo ve los suyos: la columna de responsable únicamente le sirve al administrador
  const columnas = esAdministrador ? 6 : 5;

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
    estado: string = estadoFiltro,
    responsable: string = responsableFiltro
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append('fecha_desde', desde);
      if (hasta) params.append('fecha_hasta', hasta);
      if (estado) params.append('estado', estado);
      if (responsable) params.append('responsable_legajo', responsable);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/checklist/${query}`);
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
      // 1. Cargar Checklists de forma aislada
      try {
        const resChecklists = await apiFetch(`/checklist/`);
        if (!cancelado) {
          if (resChecklists.ok) {
            const data: Checklist[] = await resChecklists.json();
            setChecklists(data);
            const hoyIso = obtenerFechaLocalHoy();
            // el administrador recibe los de todos: el "del día" es el propio
            const encontrado = data.find(
              (c) => c.fecha === hoyIso && c.responsable_legajo === usuario?.legajo
            );
            if (encontrado) {
              setChecklistHoyId(encontrado.id);
            }
          } else {
            setChecklists([]);
          }
        }
      } catch (err) {
        console.error('Error al cargar checklists:', err);
        if (!cancelado) {
          setChecklists([]);
          mostrarError('No se pudo conectar con el servidor para cargar las checklists.');
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }

      // 2. Cargar los operadores (solo para el filtro del administrador; el listado de personal es suyo)
      if (!esAdministrador) return;
      try {
        const resPersonal = await apiFetch(`/personal`);
        if (!cancelado && resPersonal.ok) {
          const dataPersonal: PersonalResumen[] = await resPersonal.json();
          if (Array.isArray(dataPersonal)) {
            setPersonal(
              dataPersonal.filter(
                (p) => p.activo && (p.capacidad === 'OPERAR' || p.capacidad === 'AMBAS')
              )
            );
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar el listado de personal:', err);
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [esAdministrador, usuario]);

  const hoy = obtenerFechaLocalHoy();

  const {
    itemsPaginados: checklistsPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(checklists);

  const handleFiltrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      mostrarError("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.", "Rango de fechas inválido");
      return;
    }
    await recargarChecklists(fechaDesde, fechaHasta, estadoFiltro, responsableFiltro);
  };

  const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoEstado = e.target.value;
    setEstadoFiltro(nuevoEstado);
    if (!(fechaDesde && fechaHasta && fechaDesde > fechaHasta)) {
      await recargarChecklists(fechaDesde, fechaHasta, nuevoEstado, responsableFiltro);
    }
  };

  const handleResponsableChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoResponsable = e.target.value;
    setResponsableFiltro(nuevoResponsable);
    if (!(fechaDesde && fechaHasta && fechaDesde > fechaHasta)) {
      await recargarChecklists(fechaDesde, fechaHasta, estadoFiltro, nuevoResponsable);
    }
  };

  const handleLimpiarFiltro = async () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('');
    setResponsableFiltro('');
    await recargarChecklists('', '', '', '');
  };

  const handleGenerarChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerando(true);
    try {
      // el responsable lo define la sesión: cada operador genera el suyo
      const res = await apiFetch(`/checklist/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const nueva = await res.json();
        setModalGenerar(false);
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
          <h1>{esAdministrador ? 'Historial de Checklists' : 'Mis Checklists'}</h1>
          <div className="subtitulo">
            {esAdministrador ? '01 · Historial y Seguimiento' : '01 · Mis tareas e historial'}
          </div>
        </div>

        <div className="top-bar-acciones">
          {esAdministrador && onTareasNoRealizadasClick && (
            <button
              onClick={onTareasNoRealizadasClick}
              className="btn-guardar"
              style={{
                backgroundColor: 'var(--color-alerta-fondo, #fffbeb)',
                color: 'var(--color-alerta-texto, #b45309)',
                border: '1px solid var(--color-alerta-borde, #fde68a)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '0.65rem 1.25rem',
                cursor: 'pointer',
              }}
              title="Ver tareas no realizadas que aún se pueden reasignar"
            >
              Tareas No Realizadas Reasignables
            </button>
          )}

          {checklistHoyId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => onDetalleClick(checklistHoyId)}
                className="btn-dia-ver"
                title="Abrir tu checklist de hoy"
              >
                📅 Ver mi Checklist del Día
              </button>
              {checklists.find((c) => c.id === checklistHoyId)?.tiene_reasignacion_no_leida && (
                <span
                  style={{
                    backgroundColor: 'var(--color-primario-fondo, #eff6ff)',
                    color: 'var(--color-primario, #1d4ed8)',
                    border: '1px solid var(--color-primario, #3b82f6)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  ✦ Nueva tarea reasignada
                </span>
              )}
            </div>
          ) : esOperador ? (
            <button
              onClick={() => setModalGenerar(true)}
              className="btn-guardar"
              title="Generar tu checklist de hoy con las tareas que tenés asignadas"
            >
              + Generar mi Checklist del Día
            </button>
          ) : null}
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
          {esAdministrador && (
            <div className="filtro-campo-grupo">
              <label htmlFor="filtro-responsable">Operador:</label>
              <select
                id="filtro-responsable"
                value={responsableFiltro}
                onChange={handleResponsableChange}
              >
                <option value="">Todos los operadores</option>
                {personal.map((p) => (
                  <option key={p.legajo} value={p.legajo}>
                    {p.apellido}, {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="filtros-acciones">
          <button type="submit" className="btn-filtrar" title="Filtrar historial">
            🔍 Filtrar
          </button>
          {(fechaDesde || fechaHasta || estadoFiltro || responsableFiltro) && (
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
              {esAdministrador && <th>Responsable</th>}
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnas} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Cargando historial de checklists...
                </td>
              </tr>
            ) : checklists.length === 0 ? (
              <tr>
                <td colSpan={columnas} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  {fechaDesde || fechaHasta || estadoFiltro || responsableFiltro
                    ? 'No se encontraron checklists registrados con los filtros seleccionados.'
                    : esAdministrador
                    ? 'No se encontraron checklists registrados.'
                    : 'Todavía no generaste ningún checklist. Usá "Generar mi Checklist del Día" para empezar.'}
                </td>
              </tr>
            ) : (
              checklistsPaginados.map((c) => {
                const fillClass =
                  c.porcentaje_cumplimiento === 100
                    ? ''
                    : c.porcentaje_cumplimiento > 0
                    ? 'parcial'
                    : 'vacio';

                const estaExpandido = checklistExpandido === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="btn-expandir-fila"
                          onClick={() => setChecklistExpandido((prev) => (prev === c.id ? null : c.id))}
                          title={estaExpandido ? 'Ocultar tareas y procedimientos' : 'Ver tareas y procedimientos'}
                        >
                          {estaExpandido ? '▲' : '▼'}
                        </button>
                        <strong>#{c.id}</strong>
                      </td>
                      <td>{c.fecha}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          <span className={`badge-estado ${c.estado}`}>
                            {c.estado}
                          </span>
                          {c.responsable_legajo === usuario?.legajo && c.tiene_reasignacion_no_leida && (
                            <span
                              className="badge-nueva-tarea-pill"
                              style={{
                                backgroundColor: 'var(--color-primario-fondo, #eff6ff)',
                                color: 'var(--color-primario, #1d4ed8)',
                                border: '1px solid var(--color-primario, #3b82f6)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Tenés una nueva tarea reasignada en este checklist"
                            >
                              ✦ Nueva tarea reasignada
                            </span>
                          )}
                          {(c.tareas_reasignadas ?? 0) > 0 && (
                            <span
                              className="badge-reasignada-pill"
                              style={{
                                backgroundColor: 'var(--color-alerta-fondo, #fffbeb)',
                                color: 'var(--color-alerta, #d97706)',
                                border: '1px solid var(--color-alerta, #f59e0b)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                              title={`${c.tareas_reasignadas ?? 0} tarea(s) reasignada(s)`}
                            >
                              ↻ {c.tareas_reasignadas ?? 0} reasignada{(c.tareas_reasignadas ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                          {(c.tareas_no_realizadas ?? 0) > 0 && (
                            <span className="badge-justificada-pill" title={`${c.tareas_no_realizadas ?? 0} tarea(s) no realizada(s) justificada(s)`}>
                              ✓ {c.tareas_no_realizadas ?? 0} justificada{(c.tareas_no_realizadas ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                          {(c.tareas_vencidas ?? 0) > 0 && (
                            <span className="badge-vencida-pill" title={`${c.tareas_vencidas ?? 0} tarea(s) vencida(s)`}>
                              ✕ {c.tareas_vencidas ?? 0} vencida{(c.tareas_vencidas ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
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
                      {esAdministrador && (
                        <td>
                          {c.nombre_responsable || `Legajo: ${c.responsable_legajo}`}
                        </td>
                      )}
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
                    {estaExpandido && (
                      <tr className="fila-tareas-expandida">
                        <td colSpan={columnas}>
                          <div className="tareas-expandidas-contenedor">
                            <div className="tareas-expandidas-header">
                              <h4>Tareas y Procedimientos del Checklist #{c.id} ({c.fecha})</h4>
                              <button
                                type="button"
                                className="btn-ver-detalle-inline"
                                onClick={() => onDetalleClick(c.id)}
                              >
                                Abrir detalle completo y ejecutar ➔
                              </button>
                            </div>
                            <div className="tareas-expandidas-grid">
                              {c.items && c.items.length > 0 ? (
                                c.items.map((item) => (
                                  <div key={item.id} className={`tarea-expandida-card ${item.estado}`}>
                                    <div className="tarea-expandida-top">
                                      <span className="tarea-expandida-nombre">{item.nombre_tarea}</span>
                                      <span className="tarea-expandida-plan">{item.nombre_plan}</span>
                                      {item.estado === 'no_realizado' ? (
                                        <span className="badge-estado no_realizado" title="Tarea justificada como no realizada">
                                          Justificada
                                        </span>
                                      ) : item.estado === 'vencido' ? (
                                        <span className="badge-estado vencido" title="Tarea vencida">
                                          Vencida
                                        </span>
                                      ) : (
                                        <span className={`badge-estado ${item.estado}`}>{item.estado}</span>
                                      )}
                                    </div>
                                    {item.estado === 'no_realizado' && (
                                      <div className="tarea-justificacion-box">
                                        <div className="tarea-justificacion-header">
                                          <span className="tarea-justificacion-tag">Motivo de no realización:</span>
                                          <span className="tarea-justificacion-motivo">{formatearMotivo(item.motivo_no_realizado)}</span>
                                        </div>
                                        {item.observacion_no_realizado && (
                                          <p className="tarea-justificacion-texto">
                                            <strong>Observación:</strong> {item.observacion_no_realizado}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {item.descripcion_tarea && (
                                      <div className="tarea-procedimiento-box">
                                        <div className="tarea-procedimiento-header">
                                          <span className="tarea-procedimiento-tag">Procedimiento / Instrucciones:</span>
                                        </div>
                                        <p className="tarea-procedimiento-texto">
                                          {item.descripcion_tarea}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: 'var(--text)', margin: 0 }}>No hay tareas registradas en este checklist.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        etiqueta="checklists"
      />

      {modalGenerar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Generar mi Checklist del Día</h2>
              <p>
                Fecha programada: <strong>{hoy}</strong>
              </p>
            </div>

            <form onSubmit={handleGenerarChecklist}>
              <p>Se generará tu checklist de hoy con las tareas de limpieza que tenés asignadas.</p>

              <div className="form-acciones">
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={generando}
                >
                  {generando ? 'Generando...' : 'Generar mi Checklist del Día'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setModalGenerar(false)}
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