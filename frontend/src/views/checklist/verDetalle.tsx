import React, { useEffect, useState, useRef } from 'react';
import type {
  Checklist,
  ChecklistItem,
  InsumoUtilizado,
  PersonalResumen,
  CompletarTareaPayload,
} from './tipos';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
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
  const [modalArchivoImagen, setModalArchivoImagen] = useState<File | null>(null);
  const [formInsumos, setFormInsumos] = useState<InsumoUtilizado[]>([]);
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [modalImagenVer, setModalImagenVer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const obtenerUrlImagen = (ruta: string) => {
    return `${API_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
  };

  const recargarChecklist = async () => {
    if (!checklistId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/checklist/${checklistId}`);
      if (res.ok) {
        const data: Checklist = await res.json();
        setChecklist(data);
      }
    } catch {
      setChecklist(null);
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
          fetch(`${API_URL}/checklist/${checklistId}`),
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

  const abrirModalCompletarTarea = (tarea: ChecklistItem) => {
    if (checklist?.estado !== 'pendiente') return;
    if (tarea.estado === 'realizado') return;
    setTareaSeleccionada(tarea);
    setFormResponsable(tarea.responsable_legajo ?? '');
    setModalArchivoImagen(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    if (checklist.estado !== 'pendiente') {
      mostrarError(
        'El checklist se encuentra completado o vencido y no admite modificaciones.',
        'Auditoría cerrada'
      );
      return;
    }

    if (!formResponsable) {
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
      if (modalArchivoImagen) {
        const formData = new FormData();
        formData.append('file', modalArchivoImagen);
        const resImg = await fetch(
          `${API_URL}/checklist/${checklist.id}/tareas/${tareaSeleccionada.id}/imagen`,
          {
            method: 'POST',
            body: formData,
          }
        );
        if (!resImg.ok) {
          const errImg = await resImg.json();
          mostrarError(
            errImg.detail || 'No se pudo subir la imagen de la tarea.',
            'Error al subir imagen'
          );
          setGuardandoTarea(false);
          return;
        }
      }

      const payload: CompletarTareaPayload = {
        responsable_legajo: Number(formResponsable),
        insumos_utilizados: formInsumos,
      };

      const res = await fetch(
        `${API_URL}/checklist/${checklist.id}/tareas/${tareaSeleccionada.id}/completar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalTareaAbierto(false);
        setTareaSeleccionada(null);
        setModalArchivoImagen(null);
        await recargarChecklist();
      } else {
        const err = await res.json();
        mostrarError(
          err.detail || 'No se pudo completar la tarea del checklist.',
          'Error al guardar'
        );
      }
    } catch {
      mostrarError('Error de red al intentar completar la tarea.', 'Error de conexión');
    } finally {
      setGuardandoTarea(false);
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
          <div className="checklist-cabecera-card">
            <div className="checklist-cabecera-top">
              <div>
                <h2>Checklist #{checklist.id}</h2>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge-estado ${checklist.estado}`}>
                    {checklist.estado}
                  </span>
                  {checklist.estado === 'vencido' && (
                    <span style={{ fontSize: '0.825rem', color: '#dc2626', fontWeight: 600 }}>
                      (Auditoría cerrada · No admite modificaciones)
                    </span>
                  )}
                  {checklist.estado === 'completado' && (
                    <span style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                      (Auditoría cerrada · Checklist finalizado)
                    </span>
                  )}
                </div>
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

                          {checklist.estado === 'pendiente' && tarea.estado === 'pendiente' && (
                            <button
                              className="btn-guardar"
                              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                              onClick={() => abrirModalCompletarTarea(tarea)}
                              title="Completar tarea"
                            >
                              ✓ Completar
                            </button>
                          )}
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
                            <span>Insumos de Limpieza (Placeholder)</span>
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
                                Sin insumos registrados
                              </span>
                            )}
                          </div>

                          <div className="tarea-detalle-dato" style={{ gridColumn: 'span 2' }}>
                            <span>Evidencia Fotográfica</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                              {tarea.imagen ? (
                                <button
                                  type="button"
                                  className="tarea-evidencia-link"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    font: 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onClick={() => setModalImagenVer(obtenerUrlImagen(tarea.imagen || ''))}
                                >
                                  📷 Ver imagen adjunta
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text)', fontWeight: 400 }}>
                                  Sin evidencia adjunta
                                </span>
                              )}
                            </div>
                          </div>
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

      {modalTareaAbierto && tareaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Completar Tarea: {tareaSeleccionada.nombre_tarea}</h2>
              <p>Plan: <strong>{tareaSeleccionada.nombre_plan}</strong></p>
            </div>

            <form onSubmit={handleGuardarTarea}>
              <div className="form-group">
                <label htmlFor="tarea-responsable">
                  Responsable *
                </label>
                <select
                  id="tarea-responsable"
                  value={formResponsable}
                  onChange={(e) =>
                    setFormResponsable(
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                  required
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
                <label htmlFor="tarea-imagen-archivo">Imagen / Evidencia (Archivo de imagen)</label>
                <input
                  id="tarea-imagen-archivo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (!f.type.startsWith('image/')) {
                        mostrarError('El archivo debe ser una imagen válida (JPG, PNG, WebP, etc.).', 'Formato no soportado');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                      }
                      setModalArchivoImagen(f);
                    }
                  }}
                  style={{ marginTop: '0.35rem' }}
                />
                {modalArchivoImagen ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                      ✓ Archivo seleccionado: {modalArchivoImagen.name}
                    </span>
                    <button
                      type="button"
                      className="btn-cancelar"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setModalArchivoImagen(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ) : tareaSeleccionada.imagen ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text)', fontWeight: 500 }}>
                      Evidencia previa adjunta:
                    </span>
                    <button
                      type="button"
                      className="tarea-evidencia-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                      }}
                      onClick={() => setModalImagenVer(obtenerUrlImagen(tareaSeleccionada.imagen || ''))}
                    >
                      📷 Ver imagen
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="form-group">
                <label>
                  Insumos de Limpieza{' '}
                  <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 500 }}>
                    (Placeholder)
                  </span>
                </label>
                {formInsumos.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.25rem 0' }}>
                    No se han registrado insumos de limpieza para esta tarea.
                  </p>
                ) : (
                  <div className="insumos-form-lista">
                    {formInsumos.map((ins, idx) => (
                      <div key={idx} className="insumo-form-fila">
                        <input
                          type="text"
                          placeholder="Insumo de limpieza (Placeholder)"
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
                  {guardandoTarea ? 'Guardando...' : 'Completar Tarea'}
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

      <ErrorAlertDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog((prev) => ({ ...prev, open: false }))}
        title={errorDialog.title}
        description={errorDialog.message}
      />

      {modalImagenVer && (
        <div className="modal-overlay" onClick={() => setModalImagenVer(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '650px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Evidencia Fotográfica</h3>
              <button
                type="button"
                className="btn-cancelar"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.85rem' }}
                onClick={() => setModalImagenVer(null)}
              >
                ✕ Cerrar
              </button>
            </div>
            <img
              src={modalImagenVer}
              alt="Evidencia fotográfica"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '6px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
