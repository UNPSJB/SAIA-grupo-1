import React, { useEffect, useState } from "react";
import type { DocumentoListItem, VersionItem } from "./tipos";
import "./documentos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ModalMarcarVigenteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documento: DocumentoListItem | null;
}

export const ModalMarcarVigente: React.FC<ModalMarcarVigenteProps> = ({
  isOpen,
  onClose,
  onSuccess,
  documento,
}) => {
  const [versiones, setVersiones] = useState<VersionItem[]>([]);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [fechaVigencia, setFechaVigencia] = useState(() => new Date().toISOString().split("T")[0]);

  const [loadingVersiones, setLoadingVersiones] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documento) return;

    setError(null);
    setFechaVigencia(new Date().toISOString().split("T")[0]);

    const cargarVersiones = async () => {
      setLoadingVersiones(true);
      try {
        const res = await fetch(`${API_URL}/documentos/${documento.id}/versiones`);
        if (res.ok) {
          const data: VersionItem[] = await res.json();
          setVersiones(data);
          if (data.length > 0) {
            const vigente = data.find((v) => v.es_vigente);
            setVersionId(vigente ? vigente.id : data[0].id);
          }
        }
      } catch {
        setVersiones([]);
      } finally {
        setLoadingVersiones(false);
      }
    };

    cargarVersiones();
  }, [isOpen, documento]);

  if (!isOpen || !documento) return null;

  const versionSeleccionada = versiones.find((v) => v.id === versionId);
  const versionVigenteActual = versiones.find((v) => v.es_vigente);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!versionId) {
      setError("Debes seleccionar una versión.");
      return;
    }

    if (!fechaVigencia) {
      setError("Debes indicar la fecha de entrada en vigencia.");
      return;
    }

    setEnviando(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = localStorage.getItem("saia_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_URL}/documentos/${documento.id}/versiones/${versionId}/vigente`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            fecha_vigencia: fechaVigencia,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "No se pudo actualizar la vigencia.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al marcar la versión como vigente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-caja">
        <div className="modal-header">
          <h2>Marcar Versión Vigente</h2>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alerta-error">{error}</div>}

            <div>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Documento:</span>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
                {documento.titulo}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
                Tipo: {documento.tipo}
              </div>
            </div>

            {versionVigenteActual && (
              <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.88rem" }}>
                <span style={{ color: "#64748b" }}>Versión vigente actual: </span>
                <strong>{versionVigenteActual.version}</strong>
                {versionVigenteActual.fecha_vigencia && (
                  <span style={{ color: "#059669", marginLeft: "6px" }}>
                    (vigente desde {versionVigenteActual.fecha_vigencia})
                  </span>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="select-version-vigente">Seleccionar Versión para Entrada en Vigencia</label>
              {loadingVersiones ? (
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Cargando versiones...</div>
              ) : (
                <select
                  id="select-version-vigente"
                  value={versionId || ""}
                  onChange={(e) => setVersionId(Number(e.target.value))}
                  className="select-filtro"
                  required
                >
                  {versiones.map((v) => (
                    <option key={v.id} value={v.id}>
                      Versión {v.version} {v.es_vigente ? "(Actualmente vigente)" : v.archivado ? "(Archivada)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {versionSeleccionada && (
              <div className="alerta-confirmacion-vigente">
                <div>
                  La versión <strong>{versionSeleccionada.version}</strong> pasará a ser la <strong>única versión vigente</strong> de este documento.
                </div>
                <div style={{ marginTop: "4px" }}>
                  La versión anterior dejará de mostrarse por defecto en el listado y consultas.
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="input-fecha-vigencia">Fecha de Entrada en Vigencia</label>
              <input
                id="input-fecha-vigencia"
                type="date"
                value={fechaVigencia}
                onChange={(e) => setFechaVigencia(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={enviando || loadingVersiones}
            >
              {enviando ? "Guardando..." : "Confirmar Versión Vigente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
