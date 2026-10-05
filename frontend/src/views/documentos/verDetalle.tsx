import React, { useEffect, useState } from "react";
import type { DocumentoDetalle, TipoDocumento } from "./tipos";
import "../../styles/formularioAlta.css";
import "./documentos.css";

interface DetalleDocumentoProps {
  documentoId: number | null;
  onVolver: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const formatearFecha = (fechaStr?: string | null) => {
  if (!fechaStr) return "Sin fecha";
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

const getTipoLabel = (tipo: TipoDocumento): string => {
  switch (tipo) {
    case "MANUAL_BPM":
      return "Manual de BPM";
    case "FICHA_TECNICA":
      return "Ficha Técnica";
    case "PROCEDIMIENTO":
      return "Procedimiento";
    case "RECETA":
      return "Receta";
    default:
      return tipo;
  }
};

export const DetalleDocumento: React.FC<DetalleDocumentoProps> = ({
  documentoId,
  onVolver,
}) => {
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [loading, setLoading] = useState(Boolean(documentoId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentoId) return;

    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        const token = localStorage.getItem("saia_token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/documentos/${documentoId}`, { headers });
        if (!res.ok) {
          throw new Error("No se pudo cargar la información del documento.");
        }
        const data = await res.json();
        setDocumento(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [documentoId]);

  const versionParaDescarga = documento?.version_vigente || documento?.version_actual;

  const handleDescargar = () => {
    if (!versionParaDescarga) return;
    window.open(`${API_URL}/documentos/archivo/${versionParaDescarga.id}`, "_blank");
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Documento</h1>
        <div className="subtitulo">
          {documento ? `${getTipoLabel(documento.tipo)}: ${documento.titulo}` : `Documento #${documentoId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando documento...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : documento ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="doc-id">ID</label>
            <input id="doc-id" type="text" value={documento.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="doc-titulo">Título</label>
            <input id="doc-titulo" type="text" value={documento.titulo} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="doc-tipo">Tipo</label>
            <input id="doc-tipo" type="text" value={getTipoLabel(documento.tipo)} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="doc-descripcion">Descripción</label>
            <textarea
              id="doc-descripcion"
              rows={2}
              value={documento.descripcion || "Sin descripción"}
              disabled
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--code-bg)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="doc-version-vigente">Versión</label>
            <input
              id="doc-version-vigente"
              type="text"
              value={
                documento.version_vigente
                  ? `${documento.version_vigente.version} (vigente desde ${formatearFecha(documento.version_vigente.fecha_vigencia)})`
                  : documento.version_actual
                  ? `${documento.version_actual.version} (no vigente)`
                  : "Sin versiones registradas"
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="doc-total-versiones">Total de Versiones</label>
            <input
              id="doc-total-versiones"
              type="text"
              value={`${documento.total_versiones} versión(es)`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="doc-fecha-creado">Fecha de Registro</label>
            <input
              id="doc-fecha-creado"
              type="text"
              value={formatearFecha(documento.creado_el)}
              disabled
            />
          </div>

          {versionParaDescarga && (
            <div className="form-group">
              <label htmlFor="doc-archivo">Archivo Asociado</label>
              <input
                id="doc-archivo"
                type="text"
                value={`${versionParaDescarga.archivo_nombre_original} (${(versionParaDescarga.tamanio_bytes / 1024).toFixed(1)} KB)`}
                disabled
              />
            </div>
          )}

          <div className="form-acciones" style={{ justifyContent: "space-between", marginTop: "2rem" }}>
            <button type="button" className="btn-cancelar" onClick={onVolver}>
              Volver
            </button>
            {versionParaDescarga && (
              <button
                type="button"
                className="btn-guardar"
                onClick={handleDescargar}
                style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}
              >
                Descargar Documento
              </button>
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El documento no existe.</div>
      )}
    </div>
  );
};
