import React, { useEffect, useState } from "react";
import type { DocumentoListItem, VersionItem } from "./tipos";
import { apiFetch } from "../../api/client";
import "./documentos.css";

interface ModalMarcarVigenteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documento: DocumentoListItem | null;
}

const formatearFecha = (fechaStr?: string | null) => {
  if (!fechaStr) return "—";
  try {
    const d = new Date(fechaStr);
    return isNaN(d.getTime())
      ? fechaStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return fechaStr;
  }
};

const formatearPeso = (bytes?: number | null, formato?: string | null) => {
  if (formato) return formato;
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const ModalMarcarVigente: React.FC<ModalMarcarVigenteProps> = ({
  isOpen,
  onClose,
  onSuccess,
  documento,
}) => {
  const [versiones, setVersiones] = useState<VersionItem[]>([]);
  const [loadingVersiones, setLoadingVersiones] = useState(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarVersiones = async () => {
    if (!documento) return;
    setLoadingVersiones(true);
    setError(null);
    try {
      const res = await apiFetch(`/documentos/${documento.id}/versiones`);
      if (res.ok) {
        const data: VersionItem[] = await res.json();
        setVersiones(data);
      } else {
        throw new Error("No se pudieron cargar las versiones del documento.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoadingVersiones(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !documento) return;
    setMensajeExito(null);
    cargarVersiones();
  }, [isOpen, documento]);

  if (!isOpen || !documento) return null;

  const handleMarcarVigente = async (versionId: number) => {
    setError(null);
    setMensajeExito(null);
    setEnviandoId(versionId);

    const hoy = new Date().toISOString().split("T")[0];

    try {
      const res = await apiFetch(
        `/documentos/${documento.id}/versiones/${versionId}/vigente`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fecha_vigencia: hoy,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "No se pudo actualizar la vigencia.");
      }

      setMensajeExito("Versión marcada como vigente exitosamente.");
      await cargarVersiones();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al marcar la versión como vigente.");
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-caja modal-caja-amplia">
        <div className="modal-header">
          <div>
            <h2>Cambiar Versión Vigente</h2>
            <div style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "2px" }}>
              {documento.titulo}
            </div>
          </div>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alerta-error">{error}</div>}
          {mensajeExito && <div className="alerta-exito">{mensajeExito}</div>}

          <div style={{ fontSize: "0.88rem", color: "#64748b" }}>
            Selecciona la versión que deseas establecer como la única vigente. La fecha de entrada en vigencia se registrará automáticamente como la fecha de hoy.
          </div>

          <div className="tabla-wrapper" style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <table className="tabla-custom">
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Entrada en Vigencia</th>
                  <th>Fecha de Archivo</th>
                  <th>Peso</th>
                  <th className="acciones-col" style={{ textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loadingVersiones ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                      Cargando versiones...
                    </td>
                  </tr>
                ) : versiones.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                      No se encontraron versiones para este documento.
                    </td>
                  </tr>
                ) : (
                  versiones.map((v) => {
                    const pesoStr = formatearPeso(v.tamanio_bytes, v.tamanio_formateado);
                    return (
                      <tr key={v.id} style={{ backgroundColor: v.es_vigente ? "#f0fdf4" : "inherit" }}>
                        <td style={{ fontWeight: 600 }}>
                          v{v.version}
                          {v.es_vigente ? (
                            <span style={{
                              marginLeft: "8px",
                              backgroundColor: "#dcfce7",
                              color: "#15803d",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}>
                              Vigente
                            </span>
                          ) : (
                            <span style={{
                              marginLeft: "8px",
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}>
                              Archivada
                            </span>
                          )}
                        </td>
                        <td>{formatearFecha(v.fecha_vigencia)}</td>
                        <td>
                          {v.es_vigente ? (
                            <span style={{ color: "#16a34a", fontWeight: 500 }}>Vigente actual</span>
                          ) : (
                            formatearFecha(v.fecha_archivo)
                          )}
                        </td>
                        <td style={{ color: "#475569", fontSize: "0.85rem" }}>{pesoStr}</td>
                        <td className="acciones-col">
                          <div className="acciones-btns" style={{ justifyContent: "center" }}>
                            {v.es_vigente ? (
                              <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.85rem" }}>
                                ✓ Actual
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon btn-vigente"
                                title="Marcar como versión vigente"
                                disabled={enviandoId !== null}
                                onClick={() => handleMarcarVigente(v.id)}
                              >
                                {enviandoId === v.id ? "…" : "✓"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
