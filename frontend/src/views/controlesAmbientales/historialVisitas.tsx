import React, { useEffect, useState } from "react";
import type { ControlAmbientalConHistorial, VisitaControl } from "./tipos";
import { apiFetch } from "../../api/client";

interface ModalHistorialVisitasProps {
  isOpen: boolean;
  onClose: () => void;
  controlId: number | null;
  tipoLabel?: string;
}

const formatearFecha = (str?: string | null) => {
  if (!str) return "—";
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("es-AR");
  } catch {
    return str;
  }
};

export const ModalHistorialVisitas: React.FC<ModalHistorialVisitasProps> = ({
  isOpen,
  onClose,
  controlId,
  tipoLabel,
}) => {
  const [visitas, setVisitas] = useState<VisitaControl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !controlId) return;

    const cargarHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/controles-ambientales/${controlId}`);
        if (!res.ok) throw new Error("No se pudo cargar el historial.");
        const data: ControlAmbientalConHistorial = await res.json();
        setVisitas(data.visitas || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    cargarHistorial();
  }, [isOpen, controlId]);

  if (!isOpen || !controlId) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-caja modal-caja-amplia">
        <div className="modal-header">
          <div>
            <h2>Historial de Visitas y Certificados</h2>
            {tipoLabel && (
              <div style={{ fontSize: "0.88rem", color: "var(--color-texto-sec)", marginTop: "2px" }}>
                {tipoLabel}
              </div>
            )}
          </div>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alerta-error">{error}</div>}

          <div className="tabla-wrapper" style={{ maxHeight: "55vh", overflowY: "auto" }}>
            <table className="tabla-custom">
              <thead>
                <tr>
                  <th>Fecha Realización</th>
                  <th>Próximo Vencimiento</th>
                  <th>Observaciones</th>
                  <th>Certificado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                      Cargando historial...
                    </td>
                  </tr>
                ) : visitas.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                      Sin historial de visitas registradas.
                    </td>
                  </tr>
                ) : (
                  visitas.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{formatearFecha(v.fecha_realizacion)}</td>
                      <td>{formatearFecha(v.fecha_proximo_vencimiento)}</td>
                      <td>{v.observaciones || "—"}</td>
                      <td>
                        {v.certificado_url ? (
                          <a
                            href={`/api${v.certificado_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secundario"
                            style={{ padding: "3px 8px", fontSize: "0.8rem" }}
                          >
                            📄 Ver Comprobante ↗
                          </a>
                        ) : (
                          "Sin comprobante"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancelar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};