import React, { useEffect, useState } from "react";
import type { VersionItem } from "./tipos";
import { apiFetch } from "../../api/client";
import "./documentos.css";

interface ModalHistorialProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: number | null;
  documentoTitulo?: string;
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

export const ModalHistorialVersiones: React.FC<ModalHistorialProps> = ({
  isOpen,
  onClose,
  documentoId,
  documentoTitulo,
}) => {
  const [versiones, setVersiones] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!isOpen || !documentoId) return;

    const cargarHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/documentos/${documentoId}/historial?orden=${orden}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el historial de versiones.");
        }
        const data: VersionItem[] = await res.json();
        setVersiones(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    cargarHistorial();
  }, [isOpen, documentoId, orden]);

  if (!isOpen || !documentoId) return null;

  const handleDescargar = async (version: VersionItem) => {
    try {
      const res = await apiFetch(`/documentos/archivo/${version.id}`);
      if (!res.ok) {
        throw new Error("No se pudo descargar el archivo.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = version.archivo_nombre_original || `documento_v${version.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descargar");
    }
  };

  const handlePrevisualizar = async (version: VersionItem) => {
    try {
      const res = await apiFetch(`/documentos/archivo/${version.id}?inline=true`);
      if (!res.ok) {
        throw new Error("No se pudo previsualizar el archivo.");
      }
      const blob = await res.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, "_blank");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir previsualización");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-caja" style={{ maxWidth: "860px", width: "95%" }}>
        <div className="modal-header">
          <div>
            <h2>Historial de Versiones</h2>
            {documentoTitulo && (
              <div style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "2px" }}>
                {documentoTitulo} (solo lectura)
              </div>
            )}
          </div>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: "1.25rem 1.5rem" }}>
          {error && <div className="alerta-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Total de versiones históricas registradas: <strong>{versiones.length}</strong>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="select-orden-historial" style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Orden cronológico:
              </label>
              <select
                id="select-orden-historial"
                value={orden}
                onChange={(e) => setOrden(e.target.value as "asc" | "desc")}
                className="select-filtro"
                style={{ padding: "4px 8px", fontSize: "0.85rem" }}
              >
                <option value="asc">De más antigua a más reciente (Ascendente)</option>
                <option value="desc">De más reciente a más antigua (Descendente)</option>
              </select>
            </div>
          </div>

          <div className="tabla-wrapper" style={{ maxHeight: "55vh", overflowY: "auto" }}>
            <table className="tabla-custom">
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Fecha de Vigencia</th>
                  <th>Fecha de Archivo</th>
                  <th>Usuario</th>
                  <th>Peso</th>
                  <th className="acciones-col" style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                      Cargando historial de versiones...
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
                        <td>{v.usuario || "admin"}</td>
                        <td style={{ color: "#475569", fontSize: "0.85rem" }}>{pesoStr}</td>
                        <td className="acciones-col">
                          <div className="acciones-btns" style={{ justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn-icon btn-ver"
                              title={`Previsualizar archivo (${pesoStr})`}
                              onClick={() => handlePrevisualizar(v)}
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ backgroundColor: "#2563eb", color: "#ffffff", borderColor: "#2563eb" }}
                              title={`Descargar archivo (${pesoStr})`}
                              onClick={() => handleDescargar(v)}
                            >
                              ⬇
                            </button>
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

