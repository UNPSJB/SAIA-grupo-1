import React, { useEffect, useState } from 'react';
import type {
  Checklist,
  ChecklistItem,
  InsumoUtilizado,
  PersonalResumen,
  ChecklistItemUpdatePayload,
} from './tipos';
import {
  ErrorAlertDialog,
  ConfirmAlertDialog,
} from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';

interface DetalleChecklistProps {
  checklistId: number | null;
  onVolver: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const DetalleChecklist: React.FC<DetalleChecklistProps> = ({
  checklistId,
  onVolver,
}) => {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(Boolean(checklistId));
  const [personal, setPersonal] = useState<PersonalResumen[]>([]);

  const [planesAbiertos, setPlanesAbiertos] = useState<Record<string, boolean>>({});

  const [tareaSeleccionada, setTareaSeleccionada] = useState<ChecklistItem | null>(null);
  const [modalTareaAbierto, setModalTareaAbierto] = useState(false);
  const [formResponsable, setFormResponsable] = useState<number | ''>('');
  const [formEstado, setFormEstado] = useState<'pendiente' | 'realizado'>('pendiente');
  const [formImagen, setFormImagen] = useState('');
  const [formInsumos, setFormInsumos] = useState<InsumoUtilizado[]>([]);
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const mostrarError = (mensaje: string, titulo: string = 'Atención') => {
    setErrorDialog({
      open: true,
      title: titulo,
      message: mensaje,
    });
  };

  const recargarChecklist = async () => {
    if (!checklistId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/checklist/${checklistId}?incluir_inactivos=true`);
      if (res.ok) {
        const data: Checklist = await res.json();
        setChecklist(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checklistId) return;

    let cancelado = false;

    const cargarDatos = async () => {
      try {
        const [resChecklist, resPersonal] = await Promise.all([
          fetch(`${API_URL}/checklist/${checklistId}?incluir_inactivos=true`),
          fetch(`${API_URL}/personal/`),
        ]);

        if (!cancelado) {
          if (resChecklist.ok) {
            const data: Checklist = await resChecklist.json();
            setChecklist(data);

            setPlanesAbiertos((prev) => {
              const inicial: Record<string, boolean> = { ...prev };
              data.items.forEach((item) => {
                if (inicial[item.nombre_plan] === undefined) {
                  inicial[item.nombre_plan] = true;
                }
              });
              return inicial;
            });
          } else {
            setChecklist(null);
            mostrarError('El checklist solicitado no existe o no pudo ser cargado.');
          }

          if (resPersonal.ok) {
            const dataPersonal: PersonalResumen[] = await resPersonal.json();
            setPersonal(dataPersonal);
          }
        }
      } catch {
        if (!cancelado) {
          setChecklist(null);
          mostrarError('Error de conexión al cargar los detalles del checklist.');
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
  }, [checklistId]);

  const togglePlan = (planNombre: string) => {
    setPlanesAbiertos((prev) => ({
      ...prev,
      [planNombre]: !prev[planNombre],
    }));
  };

  const abrirModalEditarTarea = (tarea: ChecklistItem) => {
    setTareaSeleccionada(tarea);
    setFormResponsable(tarea.responsable_legajo ?? '');
    setFormEstado(tarea.estado);
    setFormImagen(tarea.imagen || '');
    setFormInsumos(
      tarea.insumos_utilizados ? [...tarea.insumos_utilizados] : []
    );
    setModalTareaAbierto(true);
  };

  const agregarInsumoFila = () => {
    setFormInsumos((prev) => [
      ...prev,
      { nombre: '', cantidad: 1, unidad: 'unidades' },
    ]);
  };

  const removerInsumoFila = (index: number) => {
    setFormInsumos((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarInsumoFila = (
    index: number,
    campo: keyof InsumoUtilizado,
    valor: string | number
  ) => {
    setFormInsumos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const handleGuardarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklist || !tareaSeleccionada) return;

    if (formEstado === 'realizado' && !formResponsable) {
      mostrarError(
        'Debe asignar un responsable para marcar la tarea como realizada.',
        'Dato requerido'
      );
      return;
    }

    for (const ins of formInsumos) {
      if (!ins.nombre.trim()) {
        mostrarError('El nombre del insumo no puede estar vacío.', 'Insumo inválido');
        return;
      }
      if (ins.cantidad <= 0 || isNaN(ins.cantidad)) {
        mostrarError(
          `La cantidad para "${ins.nombre}" debe ser mayor a 0.`,
          'Cantidad inválida'
        );
        return;
      }
    }

    setGuardandoTarea(true);
    try {
      const payload: ChecklistItemUpdatePayload = {
        responsable_legajo: formResponsable ? Number(formResponsable) : null,
        estado: formEstado,
        imagen: formImagen.trim() ? formImagen.trim() : null,
        insumos_utilizados: formInsumos,
      };

      const res = await fetch(
        `${API_URL}/checklist/${checklist.id}/tareas/${tareaSeleccionada.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalTareaAbierto(false);
        setTareaSeleccionada(null);
        await recargarChecklist();
      } else {
        const err = await res.json();
        mostrarError(
          err.detail || 'No se pudo actualizar la tarea del checklist.',
          'Error al guardar'
        );
      }
    } catch {
      mostrarError('Error de red al intentar actualizar la tarea.', 'Error de conexión');
    } finally {
      setGuardandoTarea(false);
    }
  };

  const handleBajaLogica = async () => {
    if (!checklist) return;
    setConfirmDeleteOpen(false);

    try {
      const res = await fetch(`${API_URL}/checklist/${checklist.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChecklist((prev) => (prev ? { ...prev, activo: false } : null));
      } else {
        const err = await res.json();
        mostrarError(err.detail || 'No se pudo dar de baja el checklist.');
      }
    } catch {
      mostrarError('Error al dar de baja el checklist.');
    }
  };

  const handleRestaurar = async () => {
    if (!checklist) return;

    try {
      const res = await fetch(`${API_URL}/checklist/${checklist.id}/restaurar`, {
        method: 'POST',
      });
      if (res.ok) {
        setChecklist((prev) => (prev ? { ...prev, activo: true } : null));
      } else {
        const err = await res.json();
        mostrarError(err.detail || 'No se pudo restaurar el checklist.');
      }
    } catch {
      mostrarError('Error al restaurar el checklist.');
    }
  };

  const tareasPorPlan: Record<
    string,
    { equipo: string; tareas: ChecklistItem[] }
  > = {};

  if (checklist) {
    checklist.items.forEach((item) => {
      if (!tareasPorPlan[item.nombre_plan]) {
        tareasPorPlan[item.nombre_plan] = {
          equipo: item.nombre_equipo || 'Equipo vinculado',
          tareas: [],
        };
      }
      tareasPorPlan[item.nombre_plan].tareas.push(item);
    });
  }

  return (
    <div className="checklist-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Detalle de Checklist #{checklistId}</h1>
          <div className="subtitulo">02 · Detalle y Tareas por Plan</div>
        </div>

        <button onClick={onVolver} className="btn-cancelar">
          ← Volver al Historial
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          Cargando datos del checklist...
        </div>
      ) : !checklist ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          No se encontró el checklist solicitado.
        </div>
      ) : (
        <>
          {/* Cabecera Informativa Inmutable del Checklist */}
          <div className="checklist-cabecera-card">
            <div className="checklist-cabecera-top">
              <div>
                <h2>Checklist #{checklist.id}</h2>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge-estado ${checklist.estado}`}>
                    {checklist.estado}
                  </span>
                  <span
                    className={`badge-registro ${
                      checklist.activo ? 'activo' : 'inactivo'
                    }`}
                  >
                    {checklist.activo ? '● Activo' : '○ Baja lógica'}
                  </span>
                </div>
              </div>

              <div>
                {checklist.activo ? (
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="btn-cancelar"
                    style={{ borderColor: '#dc2626', color: '#dc2626' }}
                    title="Dar de baja lógica este checklist"
                  >
                    🗑 Dar de Baja Lógica
                  </button>
                ) : (
                  <button
                    onClick={handleRestaurar}
                    className="btn-guardar"
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    title="Restaurar checklist"
                  >
                    ↺ Restaurar Checklist
                  </button>
                )}
              </div>
            </div>

            <div className="checklist-meta-grid">
              <div className="checklist-meta-item">
                <span className="label">Fecha Programada</span>
                <span className="valor">{checklist.fecha}</span>
              </div>

              <div className="checklist-meta-item">
                <span className="label">Responsable del Checklist</span>
                <span className="valor">
                  {checklist.nombre_responsable || `Legajo: ${checklist.responsable_legajo}`}
                </span>
              </div>

              <div className="checklist-meta-item">
                <span className="label">Creado en</span>
                <span className="valor">
                  {new Date(checklist.creado_en).toLocaleString()}
                </span>
              </div>

              <div className="checklist-meta-item">
                <span className="label">Cumplimiento Global</span>
                <div className="barra-progreso-wrapper" style={{ marginTop: '0.25rem' }}>
                  <div className="barra-progreso-track">
                    <div
                      className={`barra-progreso-fill ${
                        checklist.porcentaje_cumplimiento === 100
                          ? ''
                          : checklist.porcentaje_cumplimiento > 0
                          ? 'parcial'
                          : 'vacio'
                      }`}
                      style={{ width: `${checklist.porcentaje_cumplimiento}%` }}
                    />
                  </div>
                  <span className="barra-progreso-texto">
                    {checklist.porcentaje_cumplimiento}%
                  </span>
                </div>
              </div>
            </div>

            <div className="metricas-fila">
              <div className="metrica-caja">
                <div className="metrica-num">{checklist.total_tareas}</div>
                <div className="metrica-desc">Total Tareas</div>
              </div>
              <div className="metrica-caja">
                <div className="metrica-num" style={{ color: '#059669' }}>
                  {checklist.tareas_completadas}
                </div>
                <div className="metrica-desc">Realizadas</div>
              </div>
              <div className="metrica-caja">
                <div className="metrica-num" style={{ color: '#d97706' }}>
                  {checklist.tareas_pendientes}
                </div>
                <div className="metrica-desc">Pendientes</div>
              </div>
            </div>
          </div>

          {/* Listado de Tareas Agrupadas por Plan de Limpieza con Acordeón */}
          <div className="planes-seccion-titulo">
            Tareas por Plan de Limpieza
          </div>

          {Object.entries(tareasPorPlan).map(([planNombre, { equipo, tareas }]) => {
            const completadas = tareas.filter(
              (t) => t.estado === 'realizado'
            ).length;
            const abierto = planesAbiertos[planNombre] ?? true;

            return (
              <div key={planNombre} className="plan-acordeon">
                <div
                  className="plan-header"
                  onClick={() => togglePlan(planNombre)}
                  title="Haga clic para desplegar o contraer las tareas de este plan"
                >
                  <div className="plan-header-info">
                    <span className="plan-nombre">{planNombre}</span>
                    <span className="plan-equipo-tag">⚙ {equipo}</span>
                  </div>

                  <div className="plan-header-stats">
                    <span className="plan-progreso-pill">
                      {completadas}/{tareas.length} realizadas
                    </span>
                    <span className={`acordeon-chevron ${abierto ? 'abierto' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {abierto && (
                  <div className="plan-tareas-lista">
                    {tareas.map((tarea) => (
                      <div
                        key={tarea.id}
                        className={`tarea-item-card ${tarea.estado}`}
                      >
                        <div className="tarea-item-top">
                          <div className="tarea-info-principal">
                            <div className="tarea-titulo-fila">
                              <span className="tarea-nombre">
                                {tarea.nombre_tarea}
                              </span>
                              <span className="tarea-frecuencia">
                                {tarea.frecuencia}
                              </span>
                              <span className={`badge-estado ${tarea.estado}`}>
                                {tarea.estado}
                              </span>
                            </div>
                            {tarea.descripcion_tarea && (
                              <p className="tarea-descripcion">
                                {tarea.descripcion_tarea}
                              </p>
                            )}
                          </div>

                          <button
                            className="btn-guardar"
                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            onClick={() => abrirModalEditarTarea(tarea)}
                            title="Modificar o completar tarea"
                          >
                            {tarea.estado === 'realizado'
                              ? '✎ Modificar'
                              : '✓ Completar'}
                          </button>
                        </div>

                        <div className="tarea-detalles-grid">
                          <div className="tarea-detalle-dato">
                            <span>Responsable</span>
                            <span>
                              {tarea.nombre_responsable ||
                                (tarea.responsable_legajo
                                  ? `Legajo ${tarea.responsable_legajo}`
                                  : 'Sin asignar')}
                            </span>
                          </div>

                          <div className="tarea-detalle-dato">
                            <span>Finalización</span>
                            <span>
                              {tarea.fecha_hora_fin
                                ? new Date(tarea.fecha_hora_fin).toLocaleString()
                                : 'No completada'}
                            </span>
                          </div>

                          <div className="tarea-detalle-dato" style={{ gridColumn: 'span 2' }}>
                            <span>Insumos Utilizados</span>
                            {tarea.insumos_utilizados &&
                            tarea.insumos_utilizados.length > 0 ? (
                              <div className="tarea-insumos-lista">
                                {tarea.insumos_utilizados.map((ins, i) => (
                                  <span key={i} className="insumo-chip">
                                    {ins.nombre}: {ins.cantidad} {ins.unidad || 'unid.'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text)', fontWeight: 400 }}>
                                Ninguno registrado
                              </span>
                            )}
                          </div>

                          {tarea.imagen && (
                            <div className="tarea-detalle-dato" style={{ gridColumn: 'span 2' }}>
                              <span>Evidencia Fotográfica</span>
                              <a
                                href={tarea.imagen}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tarea-evidencia-link"
                              >
                                Ver imagen adjunta ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Modal para Completar / Modificar Tarea */}
      {modalTareaAbierto && tareaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Tarea: {tareaSeleccionada.nombre_tarea}</h2>
              <p>Plan: <strong>{tareaSeleccionada.nombre_plan}</strong></p>
            </div>

            <form onSubmit={handleGuardarTarea}>
              <div className="form-group">
                <label htmlFor="tarea-estado">Estado de la Tarea *</label>
                <select
                  id="tarea-estado"
                  value={formEstado}
                  onChange={(e) =>
                    setFormEstado(e.target.value as 'pendiente' | 'realizado')
                  }
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="realizado">Realizado</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tarea-responsable">
                  Responsable {formEstado === 'realizado' ? '*' : '(Opcional)'}
                </label>
                <select
                  id="tarea-responsable"
                  value={formResponsable}
                  onChange={(e) =>
                    setFormResponsable(
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                  required={formEstado === 'realizado'}
                >
                  <option value="">-- Seleccionar personal activo --</option>
                  {personal
                    .filter((p) => p.activo)
                    .map((p) => (
                      <option key={p.legajo} value={p.legajo}>
                        {p.apellido}, {p.nombre} (Legajo: {p.legajo})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tarea-imagen">URL de Imagen / Evidencia (Opcional)</label>
                <input
                  id="tarea-imagen"
                  type="url"
                  placeholder="https://servidor.com/evidencia.jpg"
                  value={formImagen}
                  onChange={(e) => setFormImagen(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Insumos Utilizados</label>
                {formInsumos.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.25rem 0' }}>
                    No se han registrado insumos para esta tarea.
                  </p>
                ) : (
                  <div className="insumos-form-lista">
                    {formInsumos.map((ins, idx) => (
                      <div key={idx} className="insumo-form-fila">
                        <input
                          type="text"
                          placeholder="Nombre del insumo (ej. Lavandina)"
                          value={ins.nombre}
                          style={{ flex: 2 }}
                          onChange={(e) =>
                            actualizarInsumoFila(idx, 'nombre', e.target.value)
                          }
                          required
                        />
                        <input
                          type="number"
                          step="0.1"
                          min="0.01"
                          placeholder="Cantidad"
                          value={ins.cantidad}
                          style={{ flex: 1 }}
                          onChange={(e) =>
                            actualizarInsumoFila(
                              idx,
                              'cantidad',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          required
                        />
                        <input
                          type="text"
                          placeholder="Unidad (ml, gr)"
                          value={ins.unidad || ''}
                          style={{ flex: 1 }}
                          onChange={(e) =>
                            actualizarInsumoFila(idx, 'unidad', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn-remover-insumo"
                          onClick={() => removerInsumoFila(idx)}
                          title="Eliminar insumo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="btn-agregar-insumo"
                  onClick={agregarInsumoFila}
                >
                  + Agregar Insumo
                </button>
              </div>

              <div className="form-acciones">
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardandoTarea}
                >
                  {guardandoTarea ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setModalTareaAbierto(false)}
                  disabled={guardandoTarea}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Dialog de Error con shadcn */}
      <ErrorAlertDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog((prev) => ({ ...prev, open: false }))}
        title={errorDialog.title}
        description={errorDialog.message}
      />

      {/* Alert Dialog de Confirmación de Baja Lógica */}
      <ConfirmAlertDialog
        open={confirmDeleteOpen}
        onConfirm={handleBajaLogica}
        onCancel={() => setConfirmDeleteOpen(false)}
        title="¿Dar de baja lógica este checklist?"
        description="El checklist se marcará como inactivo pero no se borrará físicamente. Podrás reactivarlo en cualquier momento con el botón 'Restaurar Checklist'."
        confirmText="Confirmar Baja Lógica"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </div>
  );
};

