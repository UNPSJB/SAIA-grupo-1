import React, { useEffect, useState } from "react";
import type { ControlAmbientalConHistorial } from "./tipos";
import { ModalHistorialVisitas } from "./historialVisitas";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";

interface DetalleControlProps {
  controlId: number | null;
  onVolver: () => void;
}

const formatearFecha = (str?: string | null) => {
  if (!str) return "Sin fecha";
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("es-AR");
  } catch {
    return str;
  }
};

export const DetalleControlAmbiental: React.FC<DetalleControlProps> = ({
  controlId,
  onVolver,
}) => {
  const [control, setControl] = useState<ControlAmbientalConHistorial | null>(null);
  const [loading, setLoading] = useState(Boolean(controlId));
  const [error, setError] = useState<string | null>(null);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);

  useEffect(() => {
    if (!controlId) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/controles-ambientales/${controlId}`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setControl(data);
        } else if (!cancelado) {
          setError("No se pudo cargar el control ambiental.");
        }
      } catch (err: unknown) {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error de conexión.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [controlId]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Control Ambiental</h1>
        <div className="subtitulo">
          {control ? `${control.tipo.replace("_", " ")} (ID #${control.id})` : `Control #${controlId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando datos...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : control ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label>Tipo de Control</label>
            <input type="text" value={control.tipo.replace("_", " ")} disabled />
          </div>

          <div className="form-group">
            <label>Periodicidad</label>
            <input type="text" value={`Cada ${control.periodicidad_dias} días`} disabled />
          </div>

          <div className="form-group">
            <label>Última Realización</label>
            <input type="text" value={formatearFecha(control.ultima_fecha_realizacion)} disabled />
          </div>

          <div className="form-group">
            <label>Próximo Vencimiento</label>
            <input type="text" value={formatearFecha(control.fecha_vencimiento)} disabled />
          </div>

          <div className="form-group">
            <label>Historial de Visitas</label>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => setModalHistorialAbierto(true)}
            >
              Consultar Historial ({control.visitas?.length || 0} visitas) ↗
            </button>
          </div>

          <div className="form-group">
            <label>Observaciones</label>
            <textarea rows={3} value={control.observaciones || "Sin observaciones"} disabled />
          </div>
        </form>
      ) : null}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>

      <ModalHistorialVisitas
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        controlId={control?.id ?? null}
        tipoLabel={control?.tipo.replace("_", " ")}
      />
    </div>
  );
};