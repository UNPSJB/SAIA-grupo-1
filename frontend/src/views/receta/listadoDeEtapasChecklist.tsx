// src/views/recetas/listadoChecklistReceta.tsx
import React, { useEffect, useState } from 'react';
import type { ChecklistReceta, PersonalResumen } from './tipos';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';

interface ListadoChecklistsRecetaProps {
  onDetalleClick: (id: number) => void;
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

export const ListadoChecklistsReceta: React.FC<ListadoChecklistsRecetaProps> = ({
  onDetalleClick,
}) => {
  const { esAdministrador, esOperador, usuario } = useAuth();
  const [checklists, setChecklists] = useState<ChecklistReceta[]>([]);
  const [loading, setLoading] = useState(true);

  const [personal, setPersonal] = useState<PersonalResumen[]>([]);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [generando, setGenerando] = useState(false);

  const [fechaFiltro, setFechaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');
  const [checklistHoyId, setChecklistHoyId] = useState<number | null>(null);
  const [checklistExpandido, setChecklistExpandido] = useState<number | null>(null);
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
    fecha: string = fechaFiltro,
    estado: string = estadoFiltro,
    responsable: string = responsableFiltro
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fecha) params.append('fecha', fecha);
      if (estado) params.append('estado', estado);
      if (responsable) params.append('responsable_legajo', responsable);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/recetas/checklist${query}`);
      if (res.ok) {
        const data: ChecklistReceta[] = await res.json();
        setChecklists(data);
        const hoyIso = obtenerFechaLocalHoy();
        const encontrado = data.find(
          (c) => c.fecha === hoyIso && c.responsable_legajo === usuario?.legajo
        );
        if (encontrado) {
          setChecklistHoyId(encontrado.id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(err.detail || 'No se pudieron filtrar los checklists de recetas.');
        setChecklists([]);
      }
    } catch {
      setChecklists([]);
      mostrarError('No se pudo conectar con el servidor para cargar los checklists de recetas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;

    const cargarDatos = async () => {
      try {
        const resChecklists = await apiFetch(`/recetas/checklist`);
        if (!cancelado) {
          if (resChecklists.ok) {
            const data: ChecklistReceta[] = await resChecklists.json();
            setChecklists(data);
            const hoyIso = obtenerFechaLocalHoy();
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
      } catch {
        if (!cancelado) {
          setChecklists([]);
          mostrarError('No se pudo conectar con el servidor para cargar los checklists de recetas.');
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }

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
    await recargarChecklists(fechaFiltro, estadoFiltro, responsableFiltro);
  };

  const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoEstado = e.target.value;
    setEstadoFiltro(nuevoEstado);
    await recargarChecklists(fechaFiltro, nuevoEstado, responsableFiltro);
  };

  const handleResponsableChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoResponsable = e.target.value;
    setResponsableFiltro(nuevoResponsable);
    await recargarChecklists(fechaFiltro, estadoFiltro, nuevoResponsable);
  };

  const handleLimpiarFiltro = async () => {
    setFechaFiltro('');
    setEstadoFiltro('');
    setResponsableFiltro('');
    await recargarChecklists('', '', '');
  };

  const handleGenerarChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerando(true);
    try {
      const res = await apiFetch(`/recetas/checklist/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: hoy }),
      });

      if (res.ok) {
        const nueva: ChecklistReceta = await res.json();
        setModalGenerar(false);
        setChecklistHoyId(nueva.id);
        await recargarChecklists();
        onDetalleClick(nueva.id);
      } else {
        const err = await res.json().catch(() => ({}));
        const detalle =
          typeof err.detail === 'string'
            ? err.detail
            : Array.isArray(err.detail)
            ? err.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ')
            : 'Error al generar el checklist de producción del día.';
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
          <h1>
            {esAdministrador
              ? 'Checklists de Producción (Recetas)'
              : 'Mis Checklists de Recetas'}
          </h1>
          <div className="subtitulo">
            {esAdministrador
              ? '01 · Historial y Seguimiento de Etapas de Recetas'
              : '01 · Mis etapas de producción e historial'}
          </div>
        </div>

        <div className="top-bar-acciones" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {checklistHoyId ? (
            <button
              onClick={() => onDetalleClick(checklistHoyId)}
              className="btn-dia-ver"
              title="Abrir tu checklist de recetas de hoy"
            >
              📅 Ver mi Checklist de Hoy
            </button>
          ) : esOperador ? (
            <button
              onClick={() => setModalGenerar(true)}
              className="btn-guardar"
              title="Generar tu checklist de hoy con las etapas de recetas que tenés asignadas"
            >
              + Generar mi Checklist del Día
            </button>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleFiltrar} className="filtros-historial">
        <div className="filtros-rango-campos">
          <div className="filtro-campo-grupo">
            <label htmlFor="fecha-filtro">Fecha:</label>
            <input
              id="fecha-filtro"
              type="date"
              min="2000-01-01"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
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
            Filtrar
          </button>
          {(fechaFiltro || estadoFiltro || responsableFiltro) && (
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
                  Cargando historial de checklists de recetas...
                </td>
              </tr>
            ) : checklists.length === 0 ? (
              <tr>
                <td colSpan={columnas} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  {fechaFiltro || estadoFiltro || responsableFiltro
                    ? 'No se encontraron checklists registrados con los filtros seleccionados.'
                    : esAdministrador
                    ? 'No se encontraron checklists de recetas registrados.'
                    : 'Todavía no generaste ningún checklist de producción. Usá "Generar mi Checklist del Día" para empezar.'}
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
                          onClick={() =>
                            setChecklistExpandido((prev) => (prev === c.id ? null : c.id))
                          }
                          title={
                            estaExpandido
                              ? 'Ocultar etapas y procedimientos'
                              : 'Ver etapas y procedimientos'
                          }
                        >
                          {estaExpandido ? '▲' : '▼'}
                        </button>
                        <strong>#{c.id}</strong>
                      </td>
                      <td>{c.fecha}</td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span className={`badge-estado ${c.estado}`}>{c.estado}</span>
                          {(c.etapas_no_realizadas ?? 0) > 0 && (
                            <span
                              className="badge-justificada-pill"
                              title={`${c.etapas_no_realizadas ?? 0} etapa(s) no realizada(s) justificada(s)`}
                            >
                              ✓ {c.etapas_no_realizadas ?? 0} justificada
                              {(c.etapas_no_realizadas ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                          {(c.etapas_vencidas ?? 0) > 0 && (
                            <span
                              className="badge-vencida-pill"
                              title={`${c.etapas_vencidas ?? 0} etapa(s) vencida(s)`}
                            >
                              ✕ {c.etapas_vencidas ?? 0} vencida
                              {(c.etapas_vencidas ?? 0) > 1 ? 's' : ''}
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
                            title="Ver detalle del checklist y ejecutar etapas"
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
                              <h4>
                                Etapas y Procedimientos del Checklist #{c.id} ({c.fecha})
                              </h4>
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
                                  <div
                                    key={item.id}
                                    className={`tarea-expandida-card ${item.estado}`}
                                  >
                                    <div className="tarea-expandida-top">
                                      <span className="tarea-expandida-nombre">
                                        {item.nombre_etapa}
                                      </span>
                                      <span className="tarea-expandida-plan">
                                        {item.nombre_receta} · {item.cantidad} {item.unidad_medida} (
                                        {item.nombre_ingrediente || `Insumo #${item.ingrediente_id}`}
                                        )
                                      </span>
                                      {item.estado === 'no_realizado' ? (
                                        <span
                                          className="badge-estado no_realizado"
                                          title="Etapa justificada como no realizada"
                                        >
                                          Justificada
                                        </span>
                                      ) : item.estado === 'vencido' ? (
                                        <span
                                          className="badge-estado vencido"
                                          title="Etapa vencida"
                                        >
                                          Vencida
                                        </span>
                                      ) : (
                                        <span className={`badge-estado ${item.estado}`}>
                                          {item.estado}
                                        </span>
                                      )}
                                    </div>
                                    {item.estado === 'no_realizado' && (
                                      <div className="tarea-justificacion-box">
                                        <div className="tarea-justificacion-header">
                                          <span className="tarea-justificacion-tag">
                                            Motivo de no realización:
                                          </span>
                                          <span className="tarea-justificacion-motivo">
                                            {formatearMotivo(item.motivo_no_realizado)}
                                          </span>
                                        </div>
                                        {item.observacion_no_realizado && (
                                          <p className="tarea-justificacion-texto">
                                            <strong>Observación:</strong>{' '}
                                            {item.observacion_no_realizado}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {item.descripcion_pasos && (
                                      <div className="tarea-procedimiento-box">
                                        <div className="tarea-procedimiento-header">
                                          <span className="tarea-procedimiento-tag">
                                            Procedimiento / Instrucciones:
                                          </span>
                                        </div>
                                        <p className="tarea-procedimiento-texto">
                                          {item.descripcion_pasos}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: 'var(--text)', margin: 0 }}>
                                  No hay etapas registradas en este checklist.
                                </p>
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
        etiqueta="checklists de recetas"
      />

      {modalGenerar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Generar mi Checklist de Producción</h2>
              <p>
                Fecha programada: <strong>{hoy}</strong>
              </p>
            </div>

            <form onSubmit={handleGenerarChecklist}>
              <p>
                Se generará tu checklist de hoy con las etapas de recetas vigentes que tenés
                asignadas.
              </p>

              <div className="form-acciones">
                <button type="submit" className="btn-guardar" disabled={generando}>
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

export default ListadoChecklistsReceta;