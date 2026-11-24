import React, { useEffect, useState } from 'react';
import {
  convertirEntreUnidades,
  evaluarUmbral,
  formatearReglaUmbral,
  type ChecklistReceta,
  type ChecklistRecetaItem,
  type CompletarEtapaPayload,
  type LoteInsumoUsadoInput,
  type MotivoNoRealizadoReceta,
  type MarcarEtapaNoRealizadaPayload,
  type ValorControlRegistrado,
} from './tipos';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';

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

interface InsumoSelectorOption {
  id: number;
  nombre: string;
  lote: string;
  fechaVencimiento?: string | null;
  fechaVencimientoFormateada: string;
  stock: number;
  medida: string;
  estadoVencimiento: string;
  proveedor?: string | null;
}

interface DetalleChecklistRecetaProps {
  checklistId: number | null;
  onVolver: () => void;
}

export const DetalleChecklistReceta: React.FC<DetalleChecklistRecetaProps> = ({
  checklistId,
  onVolver,
}) => {
  const [checklist, setChecklist] = useState<ChecklistReceta | null>(null);
  const [loading, setLoading] = useState(Boolean(checklistId));
  const { usuario, esOperador, esAdministrador } = useAuth();

  const [motivosDisponibles, setMotivosDisponibles] = useState<
    { id: number; nombre: string }[]
  >([]);

  const [recetasAbiertas, setRecetasAbiertas] = useState<Record<string, boolean>>({});

  const [etapaSeleccionada, setEtapaSeleccionada] = useState<ChecklistRecetaItem | null>(null);
  const [modalCompletarAbierto, setModalCompletarAbierto] = useState(false);
  const [observacionesCompletar, setObservacionesCompletar] = useState('');
  const [valoresControlForm, setValoresControlForm] = useState<Record<number, string>>({});
  const [lotesDisponibles, setLotesDisponibles] = useState<InsumoSelectorOption[]>([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [lotesAsignados, setLotesAsignados] = useState<{ lote_insumo_id: string; cantidad: string }[]>([]);
  const [guardandoEtapa, setGuardandoEtapa] = useState(false);

  // Modal Etapa No Realizada
  const [modalNoRealizadaAbierto, setModalNoRealizadaAbierto] = useState(false);
  const [etapaNoRealizadaSeleccionada, setEtapaNoRealizadaSeleccionada] =
    useState<ChecklistRecetaItem | null>(null);
  const [formMotivo, setFormMotivo] = useState<MotivoNoRealizadoReceta | ''>('');
  const [formObservacion, setFormObservacion] = useState('');
  const [guardandoNoRealizada, setGuardandoNoRealizada] = useState(false);

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

  const recargarChecklist = async () => {
    if (!checklistId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/recetas/checklist/${checklistId}`);
      if (res.ok) {
        const data: ChecklistReceta = await res.json();
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
        const resChecklist = await apiFetch(`/recetas/checklist/${checklistId}`);
        if (!cancelado && resChecklist.ok) {
          const data: ChecklistReceta = await resChecklist.json();
          setChecklist(data);

          setRecetasAbiertas((prev) => {
            const inicial: Record<string, boolean> = { ...prev };
            data.items.forEach((item) => {
              if (inicial[item.nombre_receta] === undefined) {
                inicial[item.nombre_receta] = true;
              }
            });
            return inicial;
          });
        } else if (!cancelado) {
          setChecklist(null);
          mostrarError('El checklist de receta solicitado no existe o no pudo ser cargado.');
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

      try {
        const resMotivos = await apiFetch(`/checklist/motivos/?solo_activos=true`);
        if (!cancelado && resMotivos.ok) {
          const dataMotivos = await resMotivos.json();
          if (Array.isArray(dataMotivos) && dataMotivos.length > 0) {
            setMotivosDisponibles(dataMotivos);
          }
        }
      } catch (err) {
        console.warn('No se pudieron cargar los motivos:', err);
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [checklistId]);

  const toggleReceta = (recetaNombre: string) => {
    setRecetasAbiertas((prev) => ({
      ...prev,
      [recetaNombre]: !prev[recetaNombre],
    }));
  };

  const abrirModalCompletarEtapa = async (etapa: ChecklistRecetaItem) => {
    if (checklist?.estado !== 'pendiente') return;
    if (etapa.estado !== 'pendiente') return;
    setEtapaSeleccionada(etapa);
    setObservacionesCompletar(etapa.observaciones || '');
    const inicialValores: Record<number, string> = {};
    (etapa.parametros_control ?? []).forEach((_, idx) => {
      inicialValores[idx] = '';
    });
    setValoresControlForm(inicialValores);
    setLotesDisponibles([]);
    setLotesAsignados([]);
    setModalCompletarAbierto(true);

    if (etapa.tipo_insumo_id) {
      setCargandoLotes(true);
      try {
        let res = await apiFetch(`/insumos/selector?tipo_id=${etapa.tipo_insumo_id}`);
        if (res.status === 403 || res.status === 404) {
          res = await apiFetch(`/insumos-operador/selector?tipo_id=${etapa.tipo_insumo_id}`);
        }
        if (res.ok) {
          const data: InsumoSelectorOption[] = await res.json();
          const vigentes = data.filter((l) => l.stock > 0 && l.estadoVencimiento !== 'VENCIDO');
          setLotesDisponibles(vigentes);

          const sugeridos: { lote_insumo_id: string; cantidad: string }[] = [];
          let restante = Number(etapa.cantidad || 0);
          for (const l of vigentes) {
            if (restante <= 1e-6) break;
            const stockEnUnidadPaso = convertirEntreUnidades(l.stock, l.medida, etapa.unidad_medida);
            const tomar = Math.round(Math.min(stockEnUnidadPaso, restante) * 1000) / 1000;
            if (tomar > 0) {
              sugeridos.push({ lote_insumo_id: String(l.id), cantidad: String(tomar) });
              restante = Math.round((restante - tomar) * 1000) / 1000;
            }
          }
          if (sugeridos.length === 0 && vigentes.length > 0) {
            sugeridos.push({
              lote_insumo_id: String(vigentes[0].id),
              cantidad: String(etapa.cantidad),
            });
          }
          setLotesAsignados(sugeridos);
        }
      } catch {
        setLotesDisponibles([]);
        setLotesAsignados([]);
      } finally {
        setCargandoLotes(false);
      }
    }
  };

  const handleGuardarCompletarEtapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklist || !etapaSeleccionada) return;

    if (checklist.estado !== 'pendiente') {
      mostrarError(
        'El checklist se encuentra completado o vencido y no admite modificaciones.',
        'Auditoría cerrada'
      );
      return;
    }

    const lotesPayload: LoteInsumoUsadoInput[] = [];
    if (etapaSeleccionada.tipo_insumo_id && lotesDisponibles.length > 0) {
      if (lotesAsignados.length === 0) {
        mostrarError(
          'Debe asociar al menos un lote de insumo o aditivo para completar este paso.',
          'Lote requerido'
        );
        return;
      }

      const usadosIds = new Set<number>();
      let sumaCantidades = 0;

      for (const fila of lotesAsignados) {
        const lId = Number(fila.lote_insumo_id);
        const cant = Number(fila.cantidad);
        if (!fila.lote_insumo_id || Number.isNaN(lId) || lId <= 0) {
          mostrarError('Seleccione un lote válido en cada fila.', 'Lote requerido');
          return;
        }
        if (usadosIds.has(lId)) {
          mostrarError('No repita el mismo lote en dos filas distintas.', 'Lote duplicado');
          return;
        }
        if (!fila.cantidad || Number.isNaN(cant) || cant <= 0) {
          mostrarError('Ingrese una cantidad mayor a 0 para cada lote.', 'Cantidad inválida');
          return;
        }
        const loteInfo = lotesDisponibles.find((l) => l.id === lId);
        if (loteInfo) {
          const stockEnUnidadPaso = convertirEntreUnidades(
            loteInfo.stock,
            loteInfo.medida,
            etapaSeleccionada.unidad_medida
          );
          if (cant > stockEnUnidadPaso + 1e-6) {
            mostrarError(
              `El lote ${loteInfo.lote} solo tiene ${loteInfo.stock} ${loteInfo.medida} (${Math.round(stockEnUnidadPaso * 1000) / 1000} ${etapaSeleccionada.unidad_medida}) disponibles.`,
              'Stock insuficiente'
            );
            return;
          }
        }
        usadosIds.add(lId);
        sumaCantidades += cant;
        lotesPayload.push({ lote_insumo_id: lId, cantidad: Math.round(cant * 1000) / 1000 });
      }

      if (sumaCantidades + 1e-3 < etapaSeleccionada.cantidad) {
        mostrarError(
          `La suma asignada (${Math.round(sumaCantidades * 1000) / 1000} ${etapaSeleccionada.unidad_medida}) es menor a la cantidad requerida (${etapaSeleccionada.cantidad} ${etapaSeleccionada.unidad_medida}). Agregue otro lote para completar.`,
          'Cantidad incompleta'
        );
        return;
      }
    }

    const paramsCtrl = etapaSeleccionada.parametros_control ?? [];
    const valoresControl: ValorControlRegistrado[] = [];
    for (let i = 0; i < paramsCtrl.length; i++) {
      const p = paramsCtrl[i];
      const rawVal = (valoresControlForm[i] ?? '').trim();
      if (!rawVal || Number.isNaN(Number(rawVal))) {
        mostrarError(
          `Debe ingresar el valor numérico exacto para "${p.nombre_dato}".`,
          'Control requerido'
        );
        return;
      }
      const numVal = Number(rawVal);
      valoresControl.push({
        nombre_dato: p.nombre_dato,
        unidad_medida: p.unidad_medida ?? null,
        condicion: p.condicion ?? 'RANGO',
        valor_registrado: rawVal,
        umbral_minimo: p.umbral_minimo ?? null,
        umbral_maximo: p.umbral_maximo ?? null,
        cumple_umbral: evaluarUmbral(p, numVal),
      });
    }

    setGuardandoEtapa(true);
    try {
      const payload: CompletarEtapaPayload = {
        observaciones: observacionesCompletar.trim() || undefined,
        lotes_insumo: lotesPayload.length > 0 ? lotesPayload : undefined,
        valores_control: valoresControl.length > 0 ? valoresControl : undefined,
      };

      const res = await apiFetch(
        `/recetas/checklist/${checklist.id}/etapas/${etapaSeleccionada.id}/completar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalCompletarAbierto(false);
        setEtapaSeleccionada(null);
        setObservacionesCompletar('');
        setValoresControlForm({});
        setLotesDisponibles([]);
        setLotesAsignados([]);
        await recargarChecklist();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(
          err.detail || 'No se pudo completar la etapa del checklist.',
          'Error al guardar'
        );
      }
    } catch {
      mostrarError('Error de red al intentar completar la etapa.', 'Error de conexión');
    } finally {
      setGuardandoEtapa(false);
    }
  };

  const abrirModalNoRealizada = (etapa: ChecklistRecetaItem) => {
    if (checklist?.estado !== 'pendiente' || etapa.estado !== 'pendiente') return;
    setEtapaNoRealizadaSeleccionada(etapa);
    setFormMotivo('');
    setFormObservacion('');
    setModalNoRealizadaAbierto(true);
  };

  const handleGuardarNoRealizada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklist || !etapaNoRealizadaSeleccionada) return;

    if (checklist.estado !== 'pendiente') {
      mostrarError(
        'El checklist se encuentra completado o vencido y no admite modificaciones.',
        'Auditoría cerrada'
      );
      return;
    }

    if (!formMotivo) {
      mostrarError(
        'Debe seleccionar un motivo para marcar la etapa como no realizada.',
        'Motivo requerido'
      );
      return;
    }

    const esOtro = formMotivo.toLowerCase().trim() === 'otro';
    if (esOtro && !formObservacion.trim()) {
      mostrarError(
        'La observación es obligatoria cuando el motivo es "Otro".',
        'Observación requerida'
      );
      return;
    }

    setGuardandoNoRealizada(true);
    try {
      const payload: MarcarEtapaNoRealizadaPayload = {
        motivo: formMotivo,
        observacion: formObservacion.trim() || undefined,
      };

      const res = await apiFetch(
        `/recetas/checklist/${checklist.id}/etapas/${etapaNoRealizadaSeleccionada.id}/no-realizada`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalNoRealizadaAbierto(false);
        setEtapaNoRealizadaSeleccionada(null);
        setFormMotivo('');
        setFormObservacion('');
        await recargarChecklist();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(
          err.detail || 'No se pudo registrar la justificación.',
          'Error al guardar'
        );
      }
    } catch {
      mostrarError('Error de red al intentar registrar la justificación.', 'Error de conexión');
    } finally {
      setGuardandoNoRealizada(false);
    }
  };

  const etapasPorReceta: Record<string, ChecklistRecetaItem[]> = {};
  if (checklist) {
    checklist.items.forEach((item) => {
      if (!etapasPorReceta[item.nombre_receta]) {
        etapasPorReceta[item.nombre_receta] = [];
      }
      etapasPorReceta[item.nombre_receta].push(item);
    });
  }

  return (
    <div className="checklist-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Detalle de Checklist de Producción #{checklistId}</h1>
          <div className="subtitulo">02 · Detalle y Etapas por Receta</div>
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
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '0.4rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className={`badge-estado ${checklist.estado}`}>
                    {checklist.estado}
                  </span>
                  {checklist.estado === 'vencido' && (
                    <span
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--color-error-texto)',
                        fontWeight: 600,
                      }}
                    >
                      (Auditoría cerrada · No admite modificaciones)
                    </span>
                  )}
                  {checklist.estado === 'completado' && (
                    <span
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--color-exito-texto)',
                        fontWeight: 600,
                      }}
                    >
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

              {esAdministrador && (
                <div className="checklist-meta-item">
                  <span className="label">Responsable del Checklist</span>
                  <span className="valor">
                    {checklist.nombre_responsable || `Legajo: ${checklist.responsable_legajo}`}
                  </span>
                </div>
              )}

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
                <div className="metrica-num">{checklist.total_etapas}</div>
                <div className="metrica-desc">Total Etapas</div>
              </div>
              <div className="metrica-caja">
                <div className="metrica-num" style={{ color: 'var(--color-exito-texto)' }}>
                  {checklist.etapas_completadas}
                </div>
                <div className="metrica-desc">Realizadas</div>
              </div>
              <div className="metrica-caja">
                <div className="metrica-num" style={{ color: 'var(--color-primario-texto)' }}>
                  {checklist.etapas_no_realizadas ?? 0}
                </div>
                <div className="metrica-desc">Justificadas</div>
              </div>
              <div className="metrica-caja">
                <div className="metrica-num" style={{ color: 'var(--color-alerta-texto)' }}>
                  {checklist.etapas_pendientes}
                </div>
                <div className="metrica-desc">Pendientes</div>
              </div>
              {(checklist.etapas_vencidas ?? 0) > 0 && (
                <div className="metrica-caja">
                  <div className="metrica-num" style={{ color: 'var(--color-error-texto)' }}>
                    {checklist.etapas_vencidas}
                  </div>
                  <div className="metrica-desc">Vencidas</div>
                </div>
              )}
            </div>
          </div>

          <div className="planes-seccion-titulo">Etapas por Receta</div>

          {Object.entries(etapasPorReceta).map(([recetaNombre, etapas]) => {
            const completadas = etapas.filter((e) => e.estado === 'realizado').length;
            const abierto = recetasAbiertas[recetaNombre] ?? true;

            return (
              <div key={recetaNombre} className="plan-acordeon">
                <div
                  className="plan-header"
                  onClick={() => toggleReceta(recetaNombre)}
                  title="Haga clic para desplegar o contraer las etapas de esta receta"
                >
                  <div className="plan-header-info">
                    <span className="plan-nombre">{recetaNombre}</span>
                    <span className="plan-equipo-tag"><span className="material-symbols-outlined">assignment</span> Receta Vigente</span>
                  </div>

                  <div className="plan-header-stats">
                    <span className="plan-progreso-pill">
                      {completadas}/{etapas.length} realizadas
                    </span>
                    <span className={`acordeon-chevron ${abierto ? 'abierto' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {abierto && (
                  <div className="plan-tareas-lista">
                    {etapas.map((etapa) => (
                      <div key={etapa.id} className={`tarea-item-card ${etapa.estado}`}>
                        <div className="tarea-item-top">
                          <div className="tarea-info-principal">
                            <div className="tarea-titulo-fila">
                              <span className="tarea-nombre">{etapa.nombre_etapa}</span>
                              <span className="tarea-frecuencia">
                                {etapa.cantidad} {etapa.unidad_medida} ·{' '}
                                {etapa.nombre_ingrediente || `Tipo de insumo #${etapa.tipo_insumo_id}`}
                              </span>
                              {etapa.estado === 'no_realizado' ? (
                                <span
                                  className="badge-estado no_realizado"
                                  title="Etapa no realizada justificada"
                                >
                                  Justificada
                                </span>
                              ) : etapa.estado === 'vencido' ? (
                                <span className="badge-estado vencido" title="Etapa vencida">
                                  Vencida
                                </span>
                              ) : (
                                <span className={`badge-estado ${etapa.estado}`}>
                                  {etapa.estado}
                                </span>
                              )}
                            </div>
                          </div>

                          {esOperador &&
                            checklist.responsable_legajo === usuario?.legajo &&
                            (etapa.responsable_legajo == null ||
                              etapa.responsable_legajo === usuario?.legajo) &&
                            checklist.estado === 'pendiente' &&
                            etapa.estado === 'pendiente' && (
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  alignItems: 'center',
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn-guardar"
                                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                  onClick={() => abrirModalCompletarEtapa(etapa)}
                                  title="Completar etapa"
                                >
                                  ✓ Completar
                                </button>
                                <button
                                  type="button"
                                  className="btn-cancelar"
                                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                                  onClick={() => abrirModalNoRealizada(etapa)}
                                  title="Indicar motivo de no realización"
                                >
                                  ✕ No realizada
                                </button>
                              </div>
                            )}
                        </div>

                        {etapa.estado === 'no_realizado' && (
                          <div className="tarea-justificacion-box">
                            <div className="tarea-justificacion-header">
                              <span className="tarea-justificacion-tag">
                                Justificación de no realización:
                              </span>
                              <span className="tarea-justificacion-motivo">
                                {formatearMotivo(etapa.motivo_no_realizado)}
                              </span>
                            </div>
                            {etapa.observacion_no_realizado && (
                              <p className="tarea-justificacion-texto">
                                <strong>Observación:</strong> {etapa.observacion_no_realizado}
                              </p>
                            )}
                            {etapa.fecha_hora_no_realizado && (
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--color-texto-sec)',
                                  marginTop: '0.35rem',
                                }}
                              >
                                Registrado el{' '}
                                {new Date(etapa.fecha_hora_no_realizado).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}

                        {etapa.descripcion_pasos && (
                          <div className="tarea-procedimiento-box">
                            <div className="tarea-procedimiento-header">
                              <span className="tarea-procedimiento-tag">
                                Procedimiento / Instrucciones a seguir
                              </span>
                            </div>
                            <p className="tarea-procedimiento-texto">
                              {etapa.descripcion_pasos}
                            </p>
                          </div>
                        )}

                        <div className="tarea-detalles-grid">
                          <div className="tarea-detalle-dato">
                            <span>Responsable</span>
                            <span>
                              {etapa.nombre_responsable ||
                                (etapa.responsable_legajo
                                  ? `Legajo ${etapa.responsable_legajo}`
                                  : 'Sin asignar')}
                            </span>
                          </div>

                          <div className="tarea-detalle-dato">
                            <span>Estado / Registro</span>
                            <span>
                              {etapa.estado === 'realizado' && etapa.fecha_hora_fin
                                ? `Completada: ${new Date(etapa.fecha_hora_fin).toLocaleString()}`
                                : etapa.estado === 'no_realizado' && etapa.fecha_hora_no_realizado
                                ? `Justificada: ${new Date(
                                    etapa.fecha_hora_no_realizado
                                  ).toLocaleString()}`
                                : etapa.estado === 'vencido'
                                ? 'Vencida (no completada a tiempo)'
                                : 'No completada'}
                            </span>
                          </div>

                          {etapa.etapa && (
                            <div className="tarea-detalle-dato" style={{ gridColumn: '1 / -1' }}>
                              <span>Etapa</span>
                              <span style={{ fontWeight: 600 }}>{etapa.etapa}</span>
                            </div>
                          )}

                          {etapa.tipo_insumo_id && (
                            <div className="tarea-detalle-dato" style={{ gridColumn: '1 / -1' }}>
                              <span>Ingrediente / Aditivo Requerido</span>
                              <div className="tarea-insumos-lista">
                                <span className="insumo-chip">
                                  {etapa.nombre_ingrediente || `Tipo de insumo #${etapa.tipo_insumo_id}`}:{' '}
                                  {etapa.cantidad} {etapa.unidad_medida}
                                </span>
                                {etapa.lotes_insumo_usados &&
                                  etapa.lotes_insumo_usados.map((lu, idxLu) => (
                                    <span
                                      key={idxLu}
                                      className="insumo-chip"
                                      style={{
                                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                        color: '#16a34a',
                                      }}
                                    >
                                      Lote {lu.lote_codigo || `#${lu.lote_insumo_id}`}: {lu.cantidad}{' '}
                                      {etapa.unidad_medida}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                          {etapa.parametros_control && etapa.parametros_control.length > 0 && (
                            <div className="tarea-detalle-dato" style={{ gridColumn: '1 / -1' }}>
                              <span>Controles / Umbrales</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                {etapa.parametros_control.map((p, idxP) => {
                                  const reg = etapa.valores_registrados?.find(
                                    (v) => v.nombre_dato === p.nombre_dato
                                  );
                                  return (
                                    <div
                                      key={idxP}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-borde)',
                                        fontSize: '0.84rem',
                                      }}
                                    >
                                      <span>
                                        <strong>{p.nombre_dato}</strong> ({formatearReglaUmbral(p)})
                                      </span>
                                      {reg ? (
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            fontSize: '0.78rem',
                                            backgroundColor: reg.cumple_umbral
                                              ? 'rgba(34, 197, 94, 0.15)'
                                              : 'rgba(239, 68, 68, 0.15)',
                                            color: reg.cumple_umbral ? '#16a34a' : '#dc2626',
                                          }}
                                        >
                                          Registrado: {reg.valor_registrado}
                                          {reg.unidad_medida ? ` ${reg.unidad_medida}` : ''} —{' '}
                                          {reg.cumple_umbral ? 'Cumple' : 'Fuera de umbral'}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                                          Pendiente de medición
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {etapa.observaciones && (
                            <div className="tarea-detalle-dato" style={{ gridColumn: '1 / -1' }}>
                              <span>Observaciones de Ejecución</span>
                              <span>{etapa.observaciones}</span>
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

      {modalCompletarAbierto && etapaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                Completar Paso: {etapaSeleccionada.nombre_etapa}
              </h2>
              <p>
                Receta: <strong>{etapaSeleccionada.nombre_receta}</strong>
                {etapaSeleccionada.etapa ? ` · Etapa: ${etapaSeleccionada.etapa}` : ''}
              </p>
            </div>

            {etapaSeleccionada.descripcion_pasos && (
              <div className="modal-procedimiento-box">
                <div className="tarea-procedimiento-header">
                  <span className="tarea-procedimiento-tag">Procedimiento a seguir:</span>
                </div>
                <p className="tarea-procedimiento-texto">
                  {etapaSeleccionada.descripcion_pasos}
                </p>
              </div>
            )}

            <form onSubmit={handleGuardarCompletarEtapa}>
              {etapaSeleccionada.tipo_insumo_id && (
                <>
                  <div className="form-group">
                    <label>Ingrediente / Aditivo y Cantidad a Utilizar</label>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
                      {etapaSeleccionada.nombre_ingrediente ||
                        `Tipo de insumo #${etapaSeleccionada.tipo_insumo_id}`}{' '}
                      — {etapaSeleccionada.cantidad} {etapaSeleccionada.unidad_medida}
                    </p>
                  </div>

                  <div className="form-group">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label style={{ margin: 0 }}>Lotes de Insumo / Aditivo a Asociar *</label>
                      {lotesDisponibles.length > lotesAsignados.length && (
                        <button
                          type="button"
                          className="btn-cancelar"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => {
                            const asignadoActual = lotesAsignados.reduce(
                              (acc, f) => acc + (Number(f.cantidad) || 0),
                              0
                            );
                            const faltante = Math.max(
                              0,
                              Math.round((etapaSeleccionada.cantidad - asignadoActual) * 1000) / 1000
                            );
                            const yaElegidos = new Set(lotesAsignados.map((f) => f.lote_insumo_id));
                            const siguiente = lotesDisponibles.find(
                              (l) => !yaElegidos.has(String(l.id))
                            );
                            const cantSug =
                              siguiente && faltante > 0
                                ? Math.round(
                                    Math.min(
                                      convertirEntreUnidades(
                                        siguiente.stock,
                                        siguiente.medida,
                                        etapaSeleccionada.unidad_medida
                                      ),
                                      faltante
                                    ) * 1000
                                  ) / 1000
                                : faltante;
                            setLotesAsignados((prev) => [
                              ...prev,
                              {
                                lote_insumo_id: siguiente ? String(siguiente.id) : '',
                                cantidad: cantSug > 0 ? String(cantSug) : '',
                              },
                            ]);
                          }}
                        >
                          + Agregar otro lote
                        </button>
                      )}
                    </div>

                    {cargandoLotes ? (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
                        Cargando lotes disponibles...
                      </p>
                    ) : lotesDisponibles.length === 0 ? (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#dc2626' }}>
                        No hay lotes vigentes con stock disponible para este tipo de insumo.
                      </p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {lotesAsignados.map((fila, idxFila) => {
                            const loteSel = lotesDisponibles.find(
                              (l) => String(l.id) === fila.lote_insumo_id
                            );
                            const maxEnUnidadPaso = loteSel
                              ? Math.round(
                                  convertirEntreUnidades(
                                    loteSel.stock,
                                    loteSel.medida,
                                    etapaSeleccionada.unidad_medida
                                  ) * 1000
                                ) / 1000
                              : undefined;
                            const excede =
                              maxEnUnidadPaso !== undefined &&
                              fila.cantidad !== '' &&
                              Number(fila.cantidad) > maxEnUnidadPaso + 1e-6;
                            return (
                              <div
                                key={idxFila}
                                className={`lote-asignacion-fila${lotesAsignados.length > 1 ? ' con-quitar' : ''}`}
                              >
                                <select
                                  value={fila.lote_insumo_id}
                                  style={{ minWidth: 0, width: '100%' }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLotesAsignados((prev) =>
                                      prev.map((item, i) =>
                                        i === idxFila ? { ...item, lote_insumo_id: val } : item
                                      )
                                    );
                                  }}
                                  required
                                >
                                  <option value="" disabled>
                                    Seleccione lote...
                                  </option>
                                  {lotesDisponibles.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      Lote {l.lote} — {l.nombre} (Disp: {l.stock} {l.medida} · Vto:{' '}
                                      {l.fechaVencimientoFormateada})
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  max={maxEnUnidadPaso}
                                  placeholder={`Cant. (${etapaSeleccionada.unidad_medida})`}
                                  value={fila.cantidad}
                                  style={excede ? { borderColor: '#dc2626' } : undefined}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLotesAsignados((prev) =>
                                      prev.map((item, i) =>
                                        i === idxFila ? { ...item, cantidad: val } : item
                                      )
                                    );
                                  }}
                                  required
                                />

                                {lotesAsignados.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn-icon btn-eliminar"
                                    title="Quitar lote"
                                    onClick={() =>
                                      setLotesAsignados((prev) =>
                                        prev.filter((_, i) => i !== idxFila)
                                      )
                                    }
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                      close
                                    </span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {(() => {
                          const suma =
                            Math.round(
                              lotesAsignados.reduce(
                                (acc, f) => acc + (Number(f.cantidad) || 0),
                                0
                              ) * 1000
                            ) / 1000;
                          const cubre = suma + 1e-3 >= etapaSeleccionada.cantidad;
                          return (
                            <div
                              style={{
                                marginTop: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: cubre ? '#16a34a' : '#ca8a04',
                              }}
                            >
                              Total asignado: {suma} / {etapaSeleccionada.cantidad}{' '}
                              {etapaSeleccionada.unidad_medida}
                              {!cubre && ' — Agregue otro lote para cubrir la cantidad requerida'}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </>
              )}

              {etapaSeleccionada.parametros_control &&
                etapaSeleccionada.parametros_control.length > 0 && (
                  <div className="form-group">
                    <label>Valores Exactos de Control / Umbrales *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      {etapaSeleccionada.parametros_control.map((p, idx) => {
                        const raw = valoresControlForm[idx] ?? '';
                        const tieneNumero = raw.trim() !== '' && !Number.isNaN(Number(raw));
                        const cumple = tieneNumero ? evaluarUmbral(p, Number(raw)) : null;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-borde)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px',
                                gap: '8px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                {p.nombre_dato} ({formatearReglaUmbral(p)})
                              </span>
                              {cumple !== null && (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    backgroundColor: cumple
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : 'rgba(239, 68, 68, 0.15)',
                                    color: cumple ? '#16a34a' : '#dc2626',
                                  }}
                                >
                                  {cumple ? 'Dentro del umbral' : 'Fuera de umbral'}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder={`Valor exacto medido${p.unidad_medida ? ` (${p.unidad_medida})` : ''}`}
                              value={raw}
                              onChange={(e) =>
                                setValoresControlForm((prev) => ({
                                  ...prev,
                                  [idx]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className="form-group">
                <label htmlFor="etapa-observaciones">Observaciones (Opcional)</label>
                <textarea
                  id="etapa-observaciones"
                  value={observacionesCompletar}
                  onChange={(e) => setObservacionesCompletar(e.target.value)}
                  placeholder="Comentarios u observaciones sobre la ejecución de esta etapa..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-acciones">
                <button type="submit" className="btn-guardar" disabled={guardandoEtapa}>
                  {guardandoEtapa ? 'Guardando...' : 'Completar Etapa'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setModalCompletarAbierto(false)}
                  disabled={guardandoEtapa}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalNoRealizadaAbierto && etapaNoRealizadaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Marcar Etapa como No Realizada</h2>
              <p>
                Etapa: <strong>{etapaNoRealizadaSeleccionada.nombre_etapa}</strong>
              </p>
            </div>

            <form onSubmit={handleGuardarNoRealizada}>
              <div className="form-group">
                <label htmlFor="motivo-no-realizado">
                  Motivo <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <select
                  id="motivo-no-realizado"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                  }}
                >
                  <option value="">Seleccione un motivo...</option>
                  {motivosDisponibles.length > 0 ? (
                    motivosDisponibles.map((m) => (
                      <option key={m.id} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="equipo_fuera_de_uso">Equipo fuera de uso</option>
                      <option value="falta_de_insumo">Falta de insumo</option>
                      <option value="otro">Otro</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="observacion-no-realizado">
                  Observación{' '}
                  {formMotivo.toLowerCase().trim() === 'otro' ? (
                    <span style={{ color: 'var(--color-error)' }}>(Obligatoria) *</span>
                  ) : (
                    '(Opcional)'
                  )}
                </label>
                <textarea
                  id="observacion-no-realizado"
                  value={formObservacion}
                  onChange={(e) => setFormObservacion(e.target.value)}
                  placeholder={
                    formMotivo.toLowerCase().trim() === 'otro'
                      ? 'Especifique detalladamente el motivo por el cual no se pudo realizar la etapa...'
                      : 'Observaciones o detalles adicionales (opcional)...'
                  }
                  required={formMotivo.toLowerCase().trim() === 'otro'}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-acciones">
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardandoNoRealizada}
                >
                  {guardandoNoRealizada ? 'Guardando...' : 'Guardar Justificación'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setModalNoRealizadaAbierto(false);
                    setEtapaNoRealizadaSeleccionada(null);
                    setFormMotivo('');
                    setFormObservacion('');
                  }}
                  disabled={guardandoNoRealizada}
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