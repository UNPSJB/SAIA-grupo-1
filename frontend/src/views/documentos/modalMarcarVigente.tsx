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
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen || !documento) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/documentos/${documento.id}/versiones`);
        if (!cancelado && res.ok) {
          const data: VersionItem[] = await res.json();
          setVersiones(data);
        } else if (!cancelado) {
          setError("No se pudieron cargar las versiones del documento.");
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
        }
      } finally {
        if (!cancelado) {
          setLoadingVersiones(false);
        }
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [isOpen, documento, refreshKey]);

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
            fecha_vencimiento: fechaVencimiento || null,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "No se pudo actualizar la vigencia.");
      }

      setMensajeExito("Versión marcada como vigente exitosamente.");
      setRefreshKey((k) => k + 1);
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
            <div style={{ fontSize: "0.88rem", color: "var(--color-texto-sec)", marginTop: "2px" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.88rem", color: "var(--color-texto-sec)" }}>
              Selecciona la fecha de vencimiento (opcional) y luego haz clic en el botón de la versión que deseas establecer como vigente.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label htmlFor="fechaVencModal" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Fecha de Vencimiento de la versión vigente (opcional):
              </label>
              <input
                id="fechaVencModal"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--code-bg)",
                  color: "var(--text-h)",
                }}
              />
            </div>
          </div>

          <div className="tabla-wrapper" style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <table className="tabla-custom">
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Entrada en Vigencia</th>
                  <th>Vencimiento</th>
                  <th>Fecha de Archivo</th>
                  <th>Peso</th>
                  <th className="acciones-col" style={{ textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loadingVersiones ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                      Cargando versiones...
                    </td>
                  </tr>
                ) : versiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                      No se encontraron versiones para este documento.
                    </td>
                  </tr>
                ) : (
                  versiones.map((v) => {
                    const pesoStr = formatearPeso(v.tamanio_bytes, v.tamanio_formateado);
                    return (
                      <tr key={v.id} style={{ backgroundColor: v.es_vigente ? "var(--color-exito-bg)" : "inherit" }}>
                        <td style={{ fontWeight: 600 }}>
                          v{v.version}
                          {v.es_vigente ? (
                            <span style={{
                              marginLeft: "8px",
                              backgroundColor: "var(--color-exito-bg)",
                              color: "var(--color-exito-texto)",
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
                              backgroundColor: "var(--color-fondo)",
                              color: "var(--color-texto-sec)",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}>
                              Archivada
                            </span>
                          )}
                        </td>
                        <td>{formatearFecha(v.fecha_vigencia)}</td>
                        <td>{formatearFecha(v.fecha_vencimiento)}</td>
                        <td>
                          {v.es_vigente ? (
                            <span style={{ color: "var(--color-exito-texto)", fontWeight: 500 }}>Vigente actual</span>
                          ) : (
                            formatearFecha(v.fecha_archivo)
                          )}
                        </td>
                        <td style={{ color: "var(--color-texto)", fontSize: "0.85rem" }}>{pesoStr}</td>
                        <td className="acciones-col">
                          <div className="acciones-btns" style={{ justifyContent: "center" }}>
                            {v.es_vigente ? (
                              <button
                                type="button"
                                className="btn-icon btn-vigente"
                                title="Actualizar vencimiento de la versión vigente actual"
                                disabled={enviandoId !== null}
                                onClick={() => handleMarcarVigente(v.id)}
                              >
                                {enviandoId === v.id ? "…" : "✓"}
                              </button>
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
