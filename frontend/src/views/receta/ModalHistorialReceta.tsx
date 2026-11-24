import React, { useEffect, useState } from "react";
import type { VersionRecetaItem } from "./tipos";
import { apiFetch } from "../../api/client";
import "../documentos/documentos.css";

interface ModalHistorialRecetaProps {
  isOpen: boolean;
  onClose: () => void;
  recetaId: number | null;
  recetaNombre?: string;
  versionSeleccionadaId?: number | null;
  onVerVersion: (version: VersionRecetaItem) => void;
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

export const ModalHistorialVersionesReceta: React.FC<ModalHistorialRecetaProps> = ({
  isOpen,
  onClose,
  recetaId,
  recetaNombre,
  versionSeleccionadaId,
  onVerVersion,
}) => {
  const [versiones, setVersiones] = useState<VersionRecetaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!isOpen || !recetaId) return;

    let cancelado = false;
    const cargarHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/recetas/${recetaId}/versiones`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el historial de versiones de la receta.");
        }
        const data: VersionRecetaItem[] = await res.json();
        if (!cancelado) {
          setVersiones(data);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [isOpen, recetaId]);

  if (!isOpen || !recetaId) return null;

  const versionesOrdenadas = [...versiones].sort((a, b) =>
    orden === "asc" ? a.version - b.version : b.version - a.version
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-caja" style={{ maxWidth: "860px", width: "95%" }}>
        <div className="modal-header">
          <div>
            <h2>Historial de Versiones</h2>
            {recetaNombre && (
              <div
                style={{
                  fontSize: "0.88rem",
                  color: "var(--color-texto-sec)",
                  marginTop: "2px",
                }}
              >
                {recetaNombre} (solo lectura)
              </div>
            )}
          </div>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: "1.25rem 1.5rem" }}>
          {error && <div className="alerta-error">{error}</div>}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--color-texto-sec)" }}>
              Total de versiones históricas registradas:{" "}
              <strong>{versionesOrdenadas.length}</strong>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="select-orden-historial-receta"
                style={{ fontSize: "0.85rem", color: "var(--color-texto-sec)" }}
              >
                Orden cronológico:
              </label>
              <select
                id="select-orden-historial-receta"
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
                  <th>Vencimiento / Estado</th>
                  <th>Rendimiento</th>
                  <th>Usuario</th>
                  <th>Etapas</th>
                  <th className="acciones-col" style={{ textAlign: "center" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                      Cargando historial de versiones...
                    </td>
                  </tr>
                ) : versionesOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                      No se encontraron versiones para esta receta.
                    </td>
                  </tr>
                ) : (
                  versionesOrdenadas.map((v) => {
                    const esLaSeleccionada = versionSeleccionadaId === v.id;
                    return (
                      <tr
                        key={v.id}
                        style={{
                          backgroundColor: v.es_vigente
                            ? "var(--color-exito-bg)"
                            : esLaSeleccionada
                            ? "rgba(59, 130, 246, 0.08)"
                            : "inherit",
                        }}
                      >
                        <td style={{ fontWeight: 600 }}>
                          v{v.version}
                          {v.es_vigente ? (
                            <span
                              style={{
                                marginLeft: "8px",
                                backgroundColor: "var(--color-exito-bg)",
                                color: "var(--color-exito-texto)",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              Vigente
                            </span>
                          ) : (
                            <span
                              style={{
                                marginLeft: "8px",
                                backgroundColor: "var(--color-fondo)",
                                color: "var(--color-texto-sec)",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                              }}
                            >
                              Archivada
                            </span>
                          )}
                        </td>
                        <td>{formatearFecha(v.fecha_vigencia || v.creado_el)}</td>
                        <td>
                          {v.es_vigente ? (
                            <span
                              style={{ color: "var(--color-exito-texto)", fontWeight: 500 }}
                            >
                              Vigente actual
                            </span>
                          ) : (
                            formatearFecha(v.fecha_vencimiento || v.creado_el)
                          )}
                        </td>
                        <td>{v.rendimiento_final} u.</td>
                        <td>{v.usuario || "admin"}</td>
                        <td style={{ color: "var(--color-texto)", fontSize: "0.85rem" }}>
                          {v.detalles ? `${v.detalles.length} etapa(s)` : "—"}
                        </td>
                        <td className="acciones-col">
                          <div className="acciones-btns" style={{ justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn-icon btn-ver"
                              title={`Ver en detalle la versión v${v.version} (solo lectura)`}
                              onClick={() => {
                                onVerVersion(v);
                                onClose();
                              }}
                            >
                              <span className="material-symbols-outlined">visibility</span>
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