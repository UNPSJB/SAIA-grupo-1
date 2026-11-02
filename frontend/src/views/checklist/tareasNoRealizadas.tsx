import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { ChecklistItem, PersonalResumen, ReasignarTareaPayload } from './tipos';
import { ErrorAlertDialog, SuccessAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import '../../styles/checklist.css';

interface TareasNoRealizadasProps {
  onVolver: () => void;
  onDetalleChecklist: (checklistId: number) => void;
}

export const TareasNoRealizadas: React.FC<TareasNoRealizadasProps> = ({
  onVolver,
  onDetalleChecklist,
}) => {
  const [tareas, setTareas] = useState<ChecklistItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFrecuencia, setFiltroFrecuencia] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');

  const [modalReasignarAbierto, setModalReasignarAbierto] = useState(false);
  const [tareaAReasignar, setTareaAReasignar] = useState<ChecklistItem | null>(null);
  const [operadoresDisponibles, setOperadoresDisponibles] = useState<PersonalResumen[]>([]);
  const [nuevoResponsableLegajo, setNuevoResponsableLegajo] = useState<number | ''>('');
  const [motivoReasignacion, setMotivoReasignacion] = useState('');
  const [guardandoReasignacion, setGuardandoReasignacion] = useState(false);

  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [tareaHistorial, setTareaHistorial] = useState<ChecklistItem | null>(null);

  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

  const [successDialog, setSuccessDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

  const mostrarError = (message: string, title = 'Error') => {
    setErrorDialog({ open: true, title, message });
  };

  const cargarTareas = async () => {
    setCargando(true);
    try {
      const res = await apiFetch('/checklist/tareas-no-realizadas');
      if (res.ok) {
        const data = await res.json();
        setTareas(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(err.detail || 'No se pudieron cargar las tareas no realizadas.');
      }
    } catch {
      mostrarError('Error de red al intentar cargar las tareas no realizadas.', 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const cargarOperadores = async () => {
    try {
      const res = await apiFetch('/personal/');
      if (res.ok) {
        const data: PersonalResumen[] = await res.json();
        const soloOperadores = data.filter(
          (p) =>
            p.activo &&
            (p.capacidad === 'OPERAR' || p.capacidad === 'AMBAS')
        );
        setOperadoresDisponibles(soloOperadores);
      }
    } catch {
      mostrarError('Error al cargar la lista de operadores disponibles.');
    }
  };

  useEffect(() => {
    cargarTareas();
    cargarOperadores();
  }, []);

  const tareasFiltradas = tareas.filter((item) => {
    if (filtroFrecuencia && item.frecuencia !== filtroFrecuencia) {
      return false;
    }
    if (filtroMotivo) {
      const motivoVal = typeof item.motivo_no_realizado === 'object' && item.motivo_no_realizado !== null
        ? (item.motivo_no_realizado as unknown as { value: string }).value
        : String(item.motivo_no_realizado || '');
      if (motivoVal.toLowerCase() !== filtroMotivo.toLowerCase()) {
        return false;
      }
    }
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      const matchTarea = item.nombre_tarea.toLowerCase().includes(termino);
      const matchPlan = item.nombre_plan.toLowerCase().includes(termino);
      const matchEquipo = (item.nombre_equipo || '').toLowerCase().includes(termino);
      const matchResp = (item.nombre_responsable || '').toLowerCase().includes(termino);
      const matchMotivo = (item.observacion_no_realizado || '').toLowerCase().includes(termino);
      if (!matchTarea && !matchPlan && !matchEquipo && !matchResp && !matchMotivo) {
        return false;
      }
    }
    return true;
  });

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
  } = usePaginacion(tareasFiltradas);

  const abrirModalReasignar = (tarea: ChecklistItem) => {
    setTareaAReasignar(tarea);
    setNuevoResponsableLegajo('');
    setMotivoReasignacion('');
    setModalReasignarAbierto(true);
  };

  const handleGuardarReasignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaAReasignar || !nuevoResponsableLegajo) return;

    setGuardandoReasignacion(true);
    try {
      const payload: ReasignarTareaPayload = {
        nuevo_responsable_legajo: Number(nuevoResponsableLegajo),
        motivo: motivoReasignacion.trim() || undefined,
      };

      const res = await apiFetch(
        `/checklist/${tareaAReasignar.checklist_id}/tareas/${tareaAReasignar.id}/reasignar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalReasignarAbierto(false);
        setTareaAReasignar(null);
        setNuevoResponsableLegajo('');
        setMotivoReasignacion('');
        setSuccessDialog({
          open: true,
          title: 'Tarea Reasignada',
          message: 'La tarea ha sido reasignada con éxito y se registrará en el checklist correspondiente del nuevo operador.',
        });
        await cargarTareas();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(err.detail || 'No se pudo reasignar la tarea.', 'Error al reasignar');
      }
    } catch {
      mostrarError('Error de red al intentar reasignar la tarea.', 'Error de conexión');
    } finally {
      setGuardandoReasignacion(false);
    }
  };

  const formatearFechaHora = (fechaStr?: string | null) => {
    if (!fechaStr) return 'N/D';
    try {
      return new Date(fechaStr).toLocaleString();
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="checklist-container">
      <div className="listado-top-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="modulo-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <button
              onClick={onVolver}
              className="btn-cancelar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '6px 12px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ← Volver a Checklists
            </button>
          </div>
          <h1>Tareas No Realizadas Reasignables</h1>
          <div className="subtitulo">
            01 · Tareas justificadas que aún pueden ser reasignadas a otro operador
          </div>
        </div>

        <div className="top-bar-acciones">
          <button
            onClick={cargarTareas}
            className="btn-dia-ver"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            title="Actualizar listado"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-alerta, #f59e0b)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-sec)', fontWeight: 600 }}>
            Total Reasignables
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>
            {tareas.length}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-error, #ef4444)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-sec)', fontWeight: 600 }}>
            Vencen Hoy
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-error, #ef4444)' }}>
            {tareas.filter((t) => t.dias_restantes === 1).length}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primario, #3b82f6)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-sec)', fontWeight: 600 }}>
            No Diarias (Con vigencia)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-primario, #3b82f6)' }}>
            {tareas.filter((t) => t.frecuencia !== 'diaria').length}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Buscar por tarea, plan, equipo o responsable
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Escriba para filtrar..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-borde)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Frecuencia
            </label>
            <select
              value={filtroFrecuencia}
              onChange={(e) => {
                setFiltroFrecuencia(e.target.value);
                setPaginaActual(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-borde)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Todas</option>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Motivo
            </label>
            <select
              value={filtroMotivo}
              onChange={(e) => {
                setFiltroMotivo(e.target.value);
                setPaginaActual(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-borde)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Todos</option>
              <option value="equipo_fuera_de_uso">Equipo fuera de uso</option>
              <option value="falta_de_insumo">Falta de insumo</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {(busqueda || filtroFrecuencia || filtroMotivo) && (
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  setFiltroFrecuencia('');
                  setFiltroMotivo('');
                  setPaginaActual(1);
                }}
                className="btn-cancelar"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
            Cargando tareas no realizadas...
          </div>
        ) : tareasFiltradas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
            {tareas.length === 0
              ? 'No hay tareas no realizadas que puedan ser reasignadas actualmente.'
              : 'No se encontraron tareas con los filtros seleccionados.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla-listado" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-fondo-suave, #f8fafc)', borderBottom: '1px solid var(--color-borde)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Tarea / Plan</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Frecuencia</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Checklist Origen</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Responsable Anterior</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Justificación / Motivo</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700 }}>Vigencia</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPaginados.map((item: ChecklistItem) => {
                    const motivoLabel = typeof item.motivo_no_realizado === 'string'
                      ? item.motivo_no_realizado.replace(/_/g, ' ')
                      : 'No realizado';
                    const venceHoy = item.dias_restantes === 1;

                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid var(--color-borde)' }}
                      >
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {item.nombre_tarea}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-texto-sec)', marginTop: '2px' }}>
                            Plan: <strong>{item.nombre_plan}</strong>
                            {item.nombre_equipo && ` · ${item.nombre_equipo}`}
                          </div>
                          {item.descripcion_tarea && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-sec)', marginTop: '4px', maxWidth: '280px' }}>
                              {item.descripcion_tarea}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor:
                                item.frecuencia === 'diaria'
                                  ? 'var(--color-primario-fondo, #eff6ff)'
                                  : item.frecuencia === 'semanal'
                                  ? 'var(--color-alerta-fondo, #fffbeb)'
                                  : 'var(--color-exito-fondo, #ecfdf5)',
                              color:
                                item.frecuencia === 'diaria'
                                  ? 'var(--color-primario, #1d4ed8)'
                                  : item.frecuencia === 'semanal'
                                  ? 'var(--color-alerta-texto, #b45309)'
                                  : 'var(--color-exito-texto, #047857)',
                            }}
                          >
                            {item.frecuencia}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <button
                            type="button"
                            onClick={() => onDetalleChecklist(item.checklist_id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-primario, #2563eb)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              padding: 0,
                              fontSize: '0.875rem',
                              textDecoration: 'underline',
                            }}
                            title="Ver este checklist"
                          >
                            #{item.checklist_id}
                          </button>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-sec)', marginTop: '2px' }}>
                            {item.checklist_fecha || 'Fecha N/D'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {item.nombre_responsable || `Legajo: ${item.responsable_legajo}`}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', maxWidth: '260px' }}>
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-alerta-fondo, #fffbeb)',
                              color: 'var(--color-alerta-texto, #b45309)',
                              border: '1px solid var(--color-alerta-borde, #fde68a)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {motivoLabel}
                          </div>
                          {item.observacion_no_realizado && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-texto)', marginTop: '4px' }}>
                              "{item.observacion_no_realizado}"
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-texto-sec)', marginTop: '2px' }}>
                            {formatearFechaHora(item.fecha_hora_no_realizado)}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: venceHoy
                                ? 'var(--color-error-fondo, #fef2f2)'
                                : 'var(--color-exito-fondo, #ecfdf5)',
                              color: venceHoy
                                ? 'var(--color-error, #dc2626)'
                                : 'var(--color-exito-texto, #047857)',
                              border: `1px solid ${venceHoy ? 'var(--color-error, #ef4444)' : 'var(--color-exito-borde, #a7f3d0)'}`,
                            }}
                          >
                            {venceHoy ? '⚠ Vence hoy' : `Quedan ${item.dias_restantes ?? 1} días`}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => abrirModalReasignar(item)}
                              className="btn-guardar"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                backgroundColor: 'var(--color-alerta, #d97706)',
                                border: 'none',
                                whiteSpace: 'nowrap',
                              }}
                              title="Reasignar esta tarea a otro operador"
                            >
                              ⇄ Reasignar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTareaHistorial(item);
                                setModalHistorialAbierto(true);
                              }}
                              className="btn-cancelar"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                whiteSpace: 'nowrap',
                              }}
                              title="Ver historial de cambios de la tarea"
                            >
                              🕒 Historial
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              filasPorPagina={filasPorPagina}
              totalRegistros={totalRegistros}
              indiceInicio={indiceInicio}
              indiceFin={indiceFin}
              onCambiarPagina={setPaginaActual}
              onCambiarFilasPorPagina={setFilasPorPagina}
            />
          </>
        )}
      </div>

      {modalReasignarAbierto && tareaAReasignar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Reasignar Tarea: {tareaAReasignar.nombre_tarea}</h2>
              <p>
                Plan: <strong>{tareaAReasignar.nombre_plan}</strong> · Checklist #{tareaAReasignar.checklist_id}
              </p>
            </div>

            <form onSubmit={handleGuardarReasignacion} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-texto-sec)' }}>
                Esta tarea pasará al estado <strong>Reasignada</strong> en el checklist #{tareaAReasignar.checklist_id} (contando como completada para su cumplimiento)
                y se transferirá al checklist del operador seleccionado.
              </div>

              <div className="form-group">
                <label htmlFor="nuevo-operador-nr-select">
                  Nuevo Operador Responsable <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <select
                  id="nuevo-operador-nr-select"
                  value={nuevoResponsableLegajo}
                  onChange={(e) => setNuevoResponsableLegajo(e.target.value ? Number(e.target.value) : '')}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-borde)' }}
                >
                  <option value="">Seleccione un operador...</option>
                  {operadoresDisponibles.map((op) => {
                    const esMismo = op.legajo === tareaAReasignar.responsable_legajo;
                    return (
                      <option key={op.legajo} value={op.legajo}>
                        {op.apellido}, {op.nombre} (Legajo {op.legajo})
                        {esMismo ? ' - Mismo operador (reintento)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="motivo-reasignacion-nr">
                  Motivo / Justificación de la Reasignación (Opcional)
                </label>
                <textarea
                  id="motivo-reasignacion-nr"
                  value={motivoReasignacion}
                  onChange={(e) => setMotivoReasignacion(e.target.value)}
                  placeholder="Detalle el motivo del cambio de responsable..."
                  rows={3}
                  maxLength={500}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-borde)', resize: 'vertical' }}
                />
              </div>

              <div className="form-acciones" style={{ marginTop: '1.25rem' }}>
                <button
                  type="submit"
                  className="btn-guardar"
                  style={{ backgroundColor: 'var(--color-alerta, #d97706)' }}
                  disabled={guardandoReasignacion || !nuevoResponsableLegajo}
                >
                  {guardandoReasignacion ? 'Reasignando...' : 'Confirmar Reasignación'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setModalReasignarAbierto(false);
                    setTareaAReasignar(null);
                    setNuevoResponsableLegajo('');
                    setMotivoReasignacion('');
                  }}
                  disabled={guardandoReasignacion}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalHistorialAbierto && tareaHistorial && (
        <div className="modal-overlay" onClick={() => setModalHistorialAbierto(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Historial de la Tarea</h2>
              <p>
                <strong>{tareaHistorial.nombre_tarea}</strong> · Checklist #{tareaHistorial.checklist_id}
              </p>
            </div>

            <div style={{ padding: '1.25rem', maxHeight: '420px', overflowY: 'auto' }}>
              {!tareaHistorial.historial || tareaHistorial.historial.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-texto-sec)', padding: '1.5rem' }}>
                  No hay registros de historial para esta tarea.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tareaHistorial.historial.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--color-fondo-suave, #f8fafc)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-primario-fondo, #eff6ff)',
                            color: 'var(--color-primario, #1d4ed8)',
                          }}
                        >
                          {h.accion}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-sec)' }}>
                          {new Date(h.fecha_hora).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-texto)' }}>
                        {h.detalle}
                      </div>
                      {h.usuario_nombre && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
                          Por: {h.usuario_nombre}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-acciones" style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-borde)' }}>
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => setModalHistorialAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorAlertDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog((prev) => ({ ...prev, open: false }))}
        title={errorDialog.title}
        description={errorDialog.message}
      />

      <SuccessAlertDialog
        open={successDialog.open}
        onClose={() => setSuccessDialog((prev) => ({ ...prev, open: false }))}
        title={successDialog.title}
        description={successDialog.message}
      />
    </div>
  );
};
