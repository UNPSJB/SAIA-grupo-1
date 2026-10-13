import React, { useCallback, useEffect, useState } from 'react';
import type { PlanDeCalibracionConId } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
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
    <div className="modulo-container" style={{ maxWidth: '860px' }}>
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1 style={{ lineHeight: '1.25', margin: '0 0 6px 0' }}>Detalle de Plan de Calibración</h1>
          <div className="subtitulo">
            {planCalibracion
              ? `${planCalibracion.nombre} (${planCalibracion.nombre_equipo || `Equipo #${planCalibracion.equipo_id}`})`
              : `Plan #${planCalibracionID}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            {textoVolver || '← Volver a Planes de Calibración'}
          </button>
          <button type="button" className="btn-guardar" onClick={() => setModalAbierto(true)}>
            + Marcar como realizada
          </button>
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

          <div
            className="form-acciones"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'space-between',
              marginTop: '2rem',
            }}
          >
            <button type="button" className="btn-cancelar" onClick={onCancel}>
              {textoVolver || '← Volver a Planes de Calibración'}
            </button>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-cancelar"
                disabled={cantidadRealizaciones === 0}
                onClick={handleVerRealizaciones}
                style={{
                  opacity: cantidadRealizaciones === 0 ? 0.55 : 1,
                  cursor: cantidadRealizaciones === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ↺ Ver Realizaciones ({cantidadRealizaciones})
              </button>

              <button type="button" className="btn-guardar" onClick={() => setModalAbierto(true)}>
                + Marcar como realizada
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>El plan no existe.</div>
      )}

      {modalAbierto && (
        <div className="modal-abierto">
          <div className="modal-content">
            <RegistrarCalibracion
              planID={planCalibracion?.id}
              onSuccess={() => {
                setModalAbierto(false);
                fetchPlanCalibracion();
              }}
              onCancel={() => setModalAbierto(false)}
            />
          </div>
        </div>
      )}

      {modalVerCalibraciones && (
        <div className="modal-abierto">
          <div className="modal-content">
            <ListadoCalibracionesRealizadas
              planID={planCalibracion?.id}
              onCancel={() => setModalVerTodas(false)}
            />
          </div>
        </div>
      )}

      {modalVerCalibracion && (
        <div className="modal-abierto">
          <div className="modal-content">
            <VerCalibracion
              calibracionID={calibracionSeleccionada}
              onCancel={() => setModalVer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};