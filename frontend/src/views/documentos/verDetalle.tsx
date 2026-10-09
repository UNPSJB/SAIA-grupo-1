import React, { useEffect, useState } from "react";
import type { DocumentoDetalle, TipoDocumento, DocumentoListItem } from "./tipos";
import { ModalMarcarVigente } from "./modalMarcarVigente";
import { ModalHistorialVersiones } from "./modalHistorial";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";
import "./documentos.css";

interface DetalleDocumentoProps {
  documentoId: number | null;
  onVolver: () => void;
}

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

const formatearPeso = (bytes?: number | null, formato?: string | null) => {
  if (formato) return formato;
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const DetalleDocumento: React.FC<DetalleDocumentoProps> = ({
  documentoId,
  onVolver,
}) => {
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [loading, setLoading] = useState(Boolean(documentoId));
  const [error, setError] = useState<string | null>(null);

  const [modalVigenteAbierto, setModalVigenteAbierto] = useState(false);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);

  const cargar = async () => {
    if (!documentoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/documentos/${documentoId}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar la información del documento.");
      }
      const data = await res.json();
      setDocumento(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [documentoId]);

  const versionParaDescarga = documento?.version_vigente || documento?.version_actual;
  const pesoStr = versionParaDescarga
    ? formatearPeso(versionParaDescarga.tamanio_bytes, versionParaDescarga.tamanio_formateado)
    : "";

  const handleDescargar = async () => {
    if (!versionParaDescarga) return;
    try {
      const res = await apiFetch(`/documentos/archivo/${versionParaDescarga.id}`);
      if (!res.ok) {
        throw new Error("No se pudo descargar el archivo.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = versionParaDescarga.archivo_nombre_original || "documento.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al descargar el archivo.");
    }
  };

  const docParaModalVigente: DocumentoListItem | null = documento
    ? {
        id: documento.id,
        titulo: documento.titulo,
        tipo: documento.tipo,
        descripcion: documento.descripcion,
        activo: documento.activo,
        creado_el: documento.creado_el,
        version_actual: documento.version_vigente?.version ?? documento.version_actual?.version ?? null,
        version_actual_id: documento.version_vigente?.id ?? documento.version_actual?.id ?? null,
        fecha_subida_actual: documento.version_vigente?.creado_el ?? null,
        archivo_nombre_original: documento.version_vigente?.archivo_nombre_original ?? null,
        es_vigente: true,
        fecha_vigencia: documento.version_vigente?.fecha_vigencia ?? null,
        total_versiones: documento.total_versiones,
      }
    : null;

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
            <label htmlFor="doc-version-vigente">Versión Vigente</label>
            <input
              id="doc-version-vigente"
              type="text"
              value={
                documento.version_vigente
                  ? `v${documento.version_vigente.version} (vigente desde ${formatearFecha(documento.version_vigente.fecha_vigencia)})`
                  : documento.version_actual
                  ? `v${documento.version_actual.version} (no vigente)`
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
                value={`${versionParaDescarga.archivo_nombre_original} (${pesoStr})`}
                disabled
              />
            </div>
          )}

          <div className="form-acciones" style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", marginTop: "2rem" }}>
            <button type="button" className="btn-cancelar" onClick={onVolver}>
              Volver
            </button>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setModalHistorialAbierto(true)}
              >
                ↺ Historial de Versiones
              </button>

              <button
                type="button"
                className="btn-secundario"
                onClick={() => setModalVigenteAbierto(true)}
              >
                ✓ Cambiar Versión Vigente
              </button>

              {versionParaDescarga && (
                <button
                  type="button"
                  className="btn-guardar"
                  onClick={handleDescargar}
                >
                  ⬇ Descargar Documento ({pesoStr})
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El documento no existe.</div>
      )}

      <ModalMarcarVigente
        isOpen={modalVigenteAbierto}
        onClose={() => setModalVigenteAbierto(false)}
        onSuccess={() => {
          cargar();
        }}
        documento={docParaModalVigente}
      />

      <ModalHistorialVersiones
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        documentoId={documento?.id ?? null}
        documentoTitulo={documento?.titulo}
      />
    </div>
  );
};
