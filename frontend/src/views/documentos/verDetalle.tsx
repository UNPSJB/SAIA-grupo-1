import React, { useEffect, useState } from "react";
import type { DocumentoDetalle, TipoDocumento, DocumentoListItem } from "./tipos";
import { ModalMarcarVigente } from "./modalMarcarVigente";
import { ModalHistorialVersiones } from "./modalHistorial";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import "../../styles/formularioAlta.css";
import "./documentos.css";

interface DetalleDocumentoProps {
  documentoId: number | null;
  onVolver: () => void;
  textoVolver?: string;
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
  textoVolver,
}) => {
  const { esAdministrador } = useAuth();
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [loading, setLoading] = useState(Boolean(documentoId));
  const [error, setError] = useState<string | null>(null);

  const [modalVigenteAbierto, setModalVigenteAbierto] = useState(false);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalVisorAbierto, setModalVisorAbierto] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!documentoId) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/documentos/${documentoId}`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setDocumento(data);
        } else if (!cancelado) {
          setError("No se pudo cargar la información del documento.");
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
    cargar();
    return () => {
      cancelado = true;
    };
  }, [documentoId, refreshKey]);

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

  const [visorUrl, setVisorUrl] = useState<string | null>(null);
  const cargandoVisor = Boolean(versionParaDescarga?.id && !visorUrl);

  useEffect(() => {
    const versionId = versionParaDescarga?.id;
    if (!versionId) return;
    let cancelado = false;
    let urlCreada: string | null = null;

    const cargarVisor = async () => {
      try {
        const res = await apiFetch(`/documentos/archivo/${versionId}?inline=true`);
        if (!cancelado && res.ok) {
          const rawBlob = await res.blob();
          const contentType = res.headers.get("content-type") || "application/pdf";
          const blob = new Blob([rawBlob], { type: contentType });
          urlCreada = window.URL.createObjectURL(blob);
          setVisorUrl(urlCreada);
        } else if (!cancelado) {
          setVisorUrl(null);
        }
      } catch {
        if (!cancelado) {
          setVisorUrl(null);
        }
      }
    };

    cargarVisor();

    return () => {
      cancelado = true;
      if (urlCreada) {
        window.URL.revokeObjectURL(urlCreada);
      }
    };
  }, [versionParaDescarga?.id]);

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
        <h1>{esAdministrador ? "Detalle de Documento" : "Consulta de Versión Vigente"}</h1>
        <div className="subtitulo">
          {documento ? `${documento.titulo} (ID #${documento.id})` : `Documento #${documentoId}`}
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
              rows={3}
              value={documento.descripcion || "Sin descripción"}
              disabled
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
            <label htmlFor="doc-total-versiones">Historial de Versiones</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="doc-total-versiones"
                type="text"
                value=""
                disabled
                style={{ width: "100%", margin: 0 }}
              />
              <button
                type="button"
                onClick={() => setModalHistorialAbierto(true)}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "12px",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--color-primario-texto)",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                <span>Ver historial ({documento.total_versiones} versión/es)</span>
                <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>↗</span>
              </button>
            </div>
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

          <div className="form-group">
            <label htmlFor="doc-archivo">Archivo / Documento</label>
            {versionParaDescarga ? (
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  id="doc-archivo"
                  type="text"
                  value=""
                  disabled
                  style={{ width: "100%", margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setModalVisorAbierto(true)}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "12px",
                    transform: "translateY(-50%)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    color: "var(--color-primario-texto)",
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  <span>
                    Ver documento ({versionParaDescarga.archivo_nombre_original} · {pesoStr})
                  </span>
                  <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>↗</span>
                </button>
              </div>
            ) : (
              <input id="doc-archivo" type="text" value="Sin archivo adjunto" disabled />
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El documento no existe.</div>
      )}

      <div className="form-acciones" style={{ flexWrap: "wrap" }}>
        {versionParaDescarga && (
          <button type="button" className="btn-guardar" onClick={handleDescargar}>
            ⬇ Descargar ({pesoStr})
          </button>
        )}
        {esAdministrador && (
          <button
            type="button"
            className="btn-cancelar"
            onClick={() => setModalVigenteAbierto(true)}
          >
            Cambiar Vigente
          </button>
        )}
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          {textoVolver || "Volver"}
        </button>
      </div>

      <Dialog open={modalVisorAbierto} onOpenChange={setModalVisorAbierto}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {versionParaDescarga?.archivo_nombre_original || "Documento vigente"}
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "65vh",
              overflow: "hidden",
              borderRadius: "8px",
              backgroundColor: "var(--color-fondo)",
              border: "1px solid var(--color-borde)",
            }}
          >
            {cargandoVisor ? (
              <div style={{ color: "var(--color-texto-sec)" }}>Cargando visor del documento...</div>
            ) : visorUrl ? (
              <iframe
                id="visor-doc-frame"
                src={visorUrl}
                title={versionParaDescarga?.archivo_nombre_original || "Documento vigente"}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <div style={{ color: "var(--color-texto-sec)" }}>
                No se pudo cargar la vista previa en el visor.
              </div>
            )}
          </div>
          <DialogFooter>
            {versionParaDescarga && (
              <button type="button" className="btn-guardar" onClick={handleDescargar}>
                ⬇ Descargar ({pesoStr})
              </button>
            )}
            <DialogClose onClick={() => setModalVisorAbierto(false)}>Cerrar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {esAdministrador && (
        <ModalMarcarVigente
          isOpen={modalVigenteAbierto}
          onClose={() => setModalVigenteAbierto(false)}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
          documento={docParaModalVigente}
        />
      )}

      <ModalHistorialVersiones
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        documentoId={documento?.id ?? null}
        documentoTitulo={documento?.titulo}
      />
    </div>
  );
};
