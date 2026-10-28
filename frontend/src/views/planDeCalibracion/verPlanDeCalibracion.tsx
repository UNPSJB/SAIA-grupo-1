import React, { useCallback, useEffect, useState } from 'react';
import type { PlanDeCalibracionConId } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import RegistrarCalibracion from '../calibracion_Realizada/registrarCalibracion';
import { ListadoCalibracionesRealizadas } from '../calibracion_Realizada/listado';
import { VerCalibracion } from '../calibracion_Realizada/verCalibracionEcha';

interface DetallePlanCalibracionProps {
  onCancel?: () => void;
  planCalibracionID?: number | null;
  textoVolver?: string;
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

export const VerPlanDeCalibracion: React.FC<DetallePlanCalibracionProps> = ({
  onCancel,
  planCalibracionID,
  textoVolver,
}) => {
  const [planCalibracion, setPlanCalibracion] = useState<PlanDeCalibracionConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalVerCalibraciones, setModalVerTodas] = useState(false);
  const [modalVerCalibracion, setModalVer] = useState(false);
  const [calibracionSeleccionada, setCalibracionSeleccionada] = useState<number | null>(null);

  const fetchPlanCalibracion = useCallback(async () => {
    if (!planCalibracionID) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/plan_de_calibracion/${planCalibracionID}/`);
      if (res.ok) {
        const data = await res.json();
        setPlanCalibracion(data);
      } else {
        setError('No se pudo cargar la información del plan de calibración.');
      }
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [planCalibracionID]);

  useEffect(() => {
    fetchPlanCalibracion();
  }, [fetchPlanCalibracion]);

  const cantidadRealizaciones = planCalibracion?.calibraciones_realizadas?.length || 0;

  const handleVerRealizaciones = () => {
    if (cantidadRealizaciones === 1) {
      const c = planCalibracion?.calibraciones_realizadas?.[0];
      setCalibracionSeleccionada(c?.id ?? null);
      setModalVer(true);
    } else if (cantidadRealizaciones > 1) {
      setModalVerTodas(true);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>
          Detalle de Plan de Calibración
        </h1>
        <div className="subtitulo">
          {planCalibracion
            ? `${planCalibracion.nombre} (ID #${planCalibracion.id})`
            : `Plan #${planCalibracionID}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando plan de calibración...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : planCalibracion ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="cal-id">ID</label>
            <input id="cal-id" type="text" value={planCalibracion.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Plan</label>
            <input id="nombre" name="nombre" type="text" value={planCalibracion.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="equipo">Equipo</label>
            <input
              id="equipo"
              name="equipo"
              type="text"
              value={planCalibracion.nombre_equipo || `Equipo #${planCalibracion.equipo_id}`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_mantenimiento">Fecha de Mantenimiento</label>
            <input
              id="fecha_mantenimiento"
              type="text"
              value={formatDate(planCalibracion.fecha_mantenimiento)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
            <input
              id="fecha_vencimiento"
              type="text"
              value={formatDate(planCalibracion.fecha_vencimiento)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              className="descripcion"
              id="descripcion"
              name="descripcion"
              rows={3}
              value={planCalibracion.descripcion || 'Sin descripción'}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="realizaciones">Calibraciones Realizadas</label>
            {cantidadRealizaciones > 0 ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="realizaciones"
                  type="text"
                  value=""
                  disabled
                  style={{ width: '100%', margin: 0 }}
                />
                <button
                  type="button"
                  onClick={handleVerRealizaciones}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '12px',
                    transform: 'translateY(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--color-primario-texto)',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <span>Ver realizaciones ({cantidadRealizaciones})</span>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>↗</span>
                </button>
              </div>
            ) : (
              <input
                id="realizaciones"
                type="text"
                value="Sin realizaciones registradas"
                disabled
              />
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El plan no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-guardar" onClick={() => setModalAbierto(true)}>
          + Marcar como realizada
        </button>
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          {textoVolver || 'Volver'}
        </button>
      </div>

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent>
          <RegistrarCalibracion
            planID={planCalibracion?.id}
            onSuccess={() => {
              setModalAbierto(false);
              fetchPlanCalibracion();
            }}
            onCancel={() => setModalAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalVerCalibraciones} onOpenChange={setModalVerTodas}>
        <DialogContent size="lg">
          <ListadoCalibracionesRealizadas
            planID={planCalibracion?.id}
            onCancel={() => setModalVerTodas(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalVerCalibracion} onOpenChange={setModalVer}>
        <DialogContent>
          <VerCalibracion
            calibracionID={calibracionSeleccionada}
            onCancel={() => setModalVer(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

