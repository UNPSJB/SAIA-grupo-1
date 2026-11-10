import React, { useEffect, useState } from 'react';
import type { PlanConId } from './tipos';
import type { TareaConId } from '../tareas/tipos';
import '../../styles/formularioAlta.css';
import { VerTarea } from '../tareas/verTarea';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent } from '../../components/ui/dialog';

interface DetallePlanLimpiezaProps {
  onCancel?: () => void;
  planlimpiezaID?: number | null;
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

export const VerPLanDeLimpieza: React.FC<DetallePlanLimpiezaProps> = ({
  onCancel,
  planlimpiezaID,
}) => {
  const [planLimpieza, setPlanLimp] = useState<PlanConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVerTarea, setModelVer] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    if (!planlimpiezaID) return;
    let cancelado = false;
    const fetchPlanLimp = async () => {
      try {
        const res = await apiFetch(`/plan_De_limpieza/${planlimpiezaID}`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setPlanLimp(data);
        } else if (!cancelado) {
          setError('No se pudo cargar la información del plan de limpieza.');
        }
      } catch {
        if (!cancelado) setError('Error al conectar con el servidor.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchPlanLimp();
    return () => {
      cancelado = true;
    };
  }, [planlimpiezaID]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Plan de Limpieza</h1>
        <div className="subtitulo">
          {planLimpieza
            ? `${planLimpieza.nombre} (ID #${planLimpieza.id})`
            : `Plan #${planlimpiezaID}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando plan de limpieza...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : planLimpieza ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="limp-id">ID</label>
            <input id="limp-id" type="text" value={planLimpieza.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Plan</label>
            <input id="nombre" name="nombre" type="text" value={planLimpieza.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="objetivo">{planLimpieza.nombre_sector ? 'Sector' : 'Equipo'}</label>
            <input
              id="objetivo"
              name="objetivo"
              type="text"
              value={planLimpieza.nombre_sector || planLimpieza.nombre_equipo || ''}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_inicio">Fecha de Inicio</label>
            <input
              id="fecha_inicio"
              type="text"
              value={formatDate(planLimpieza.fecha_inicio)}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Tareas del Plan</label>
            {!planLimpieza.tareas || planLimpieza.tareas.length === 0 ? (
              <input type="text" value="Sin tareas registradas" disabled />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {planLimpieza.tareas.map((t: TareaConId) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem 0.55rem 1rem',
                      backgroundColor: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.95rem',
                      color: 'var(--text-h)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-texto)' }}>{t.nombre}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-texto-sec)' }}>
                        Frecuencia: {t.frecuencia} · Responsable: {t.nombre_personal ?? 'Sin asignar'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ver"
                      title="Ver detalles"
                      onClick={() => {
                        setTareaSeleccionada(t.id);
                        setModelVer(true);
                      }}
                    >
                      👁
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El plan no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>

      <Dialog open={modalVerTarea} onOpenChange={setModelVer}>
        <DialogContent>
          <VerTarea tareaID={tareaSeleccionada} onCancel={() => setModelVer(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
