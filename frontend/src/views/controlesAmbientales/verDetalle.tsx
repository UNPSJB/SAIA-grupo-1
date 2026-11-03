import React, { useEffect, useState } from "react";
import type { ControlAmbientalConHistorial } from "./tipos";
import { ModalHistorialVisitas } from "./historialVisitas";
import { ModalRegistrarVisita } from "./registrarVisita";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import "../../styles/formularioAlta.css";

interface DetalleControlProps {
  controlId: number | null;
  onVolver: () => void;
}

const formatearFecha = (str?: string | null) => {
  if (!str) return "Sin fecha";
  try {
    const soloFecha = str.split("T")[0];
    const partes = soloFecha.split("-");
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }
    return str;
  } catch {
    return str;
  }
};

const getTipoLabel = (tipo?: string | null): string => {
  if (!tipo) return "—";
  switch (tipo) {
    case "CONTROL_PLAGAS":
      return "Control de Plagas";
    case "ANALISIS_AGUA":
      return "Análisis de Agua";
    case "LIMPIEZA_TANQUE":
      return "Limpieza de Tanque";
    default:
      return tipo.replace("_", " ");
  }
};

export const DetalleControlAmbiental: React.FC<DetalleControlProps> = ({
  controlId,
  onVolver,
}) => {
  const { esAdministrador } = useAuth();
  const [control, setControl] = useState<ControlAmbientalConHistorial | null>(null);
  const [loading, setLoading] = useState(Boolean(controlId));
  const [error, setError] = useState<string | null>(null);

  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [controlId, refreshKey]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Control Sanitario</h1>
        <div className="subtitulo">
          {control ? `${getTipoLabel(control.tipo)} (ID #${control.id})` : `Control #${controlId}`}
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
            <input type="text" value={getTipoLabel(control.tipo)} disabled />
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
            <label>Estado del Registro</label>
            <input type="text" value={control.activo ? "Activo" : "Inactivo"} disabled />
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
        {esAdministrador && control && control.activo && (
          <button
            type="button"
            className="btn-guardar"
            onClick={() => setModalVisitaAbierto(true)}
          >
            + Registrar Visita
          </button>
        )}
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>

      {control && (
        <ModalRegistrarVisita
          isOpen={modalVisitaAbierto}
          onClose={() => setModalVisitaAbierto(false)}
          control={control}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <ModalHistorialVisitas
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        controlId={control?.id ?? null}
        tipoLabel={getTipoLabel(control?.tipo)}
      />
    </div>
  );
};