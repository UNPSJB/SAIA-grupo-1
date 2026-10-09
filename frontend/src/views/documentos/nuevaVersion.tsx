import React, { useEffect, useRef, useState } from "react";
import type { DocumentoDetalle, TipoDocumento, VersionItem } from "./tipos";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";
import "./documentos.css";

const getTipoLabel = (tipo?: TipoDocumento) => {
  if (!tipo) return "";
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

interface NuevaVersionProps {
  documentoId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevaVersion({ documentoId, onSuccess, onCancel }: NuevaVersionProps) {
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [siguienteVersion, setSiguienteVersion] = useState<number>(2);
  const [archivo, setArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(Boolean(documentoId));
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!documentoId) return;

    const cargarDatos = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [resDoc, resVersiones] = await Promise.all([
          apiFetch(`/documentos/${documentoId}`),
          apiFetch(`/documentos/${documentoId}/versiones`),
        ]);

        if (resDoc.ok) {
          const docData: DocumentoDetalle = await resDoc.json();
          setDocumento(docData);

          if (resVersiones.ok) {
            const versionesData: VersionItem[] = await resVersiones.json();
            if (versionesData.length > 0) {
              const maxV = Math.max(...versionesData.map((v) => Number(v.version) || 0));
              setSiguienteVersion(maxV + 1);
            } else if (docData.version_actual) {
              setSiguienteVersion(Number(docData.version_actual.version) + 1);
            } else {
              setSiguienteVersion(2);
            }
          } else {
            setSiguienteVersion(docData.version_actual ? Number(docData.version_actual.version) + 1 : 2);
          }
        } else {
          throw new Error("No se pudo cargar el documento.");
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [documentoId]);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Solo se permiten archivos en formato PDF (.pdf).");
        setArchivo(null);
        return;
      }
      setErrorMsg(null);
      setArchivo(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!archivo) {
      setErrorMsg("Debes adjuntar un archivo PDF.");
      return;
    }

    if (!documentoId) {
      setErrorMsg("Documento no especificado.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("version", String(siguienteVersion));

    setGuardando(true);

    try {
      const res = await apiFetch(`/documentos/${documentoId}/versiones`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al subir la nueva versión.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Nueva versión subida y establecida como vigente exitosamente.");
      dialog.current?.showModal();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Subir Nueva Versión</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando datos del documento...</div>
      ) : errorMsg && !documento ? (
        <div className="alerta-error">{errorMsg}</div>
      ) : documento ? (
        <>
          {errorMsg && <div className="alerta-error">{errorMsg}</div>}
          {successMsg && <div className="alerta-exito">{successMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="titulo">Documento</label>
              <input
                id="titulo"
                type="text"
                value={documento.titulo}
                disabled
                style={{ opacity: 0.85, cursor: "not-allowed" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tipo">Tipo de Documento</label>
              <input
                id="tipo"
                type="text"
                value={getTipoLabel(documento.tipo)}
                disabled
                style={{ opacity: 0.85, cursor: "not-allowed" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="versionActual">Versión Vigente Actual</label>
              <input
                id="versionActual"
                type="text"
                value={documento.version_vigente?.version ? `v${documento.version_vigente.version}` : (documento.version_actual?.version ? `v${documento.version_actual.version}` : "v1")}
                disabled
                style={{ opacity: 0.85, cursor: "not-allowed" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nuevaVersion">Nueva Versión que entrará en vigencia</label>
              <input
                id="nuevaVersion"
                type="text"
                value={`v${siguienteVersion}`}
                disabled
                style={{ opacity: 0.85, cursor: "not-allowed" }}
              />
            </div>

            <div className="alerta-confirmacion-vigente">
              Al guardar, la versión <strong>v{siguienteVersion}</strong> pasará a ser la nueva versión vigente del documento y la versión actual quedará archivada en el historial.
            </div>

            <div className="form-group">
              <label htmlFor="archivo">
                Archivo PDF {archivo && `(${(archivo.size / 1024).toFixed(1)} KB)`}
              </label>
              <input
                id="archivo"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleArchivoChange}
                required
              />
            </div>

            <div className="form-acciones">
              <button type="submit" className="btn-guardar" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar y Entrar en Vigencia"}
              </button>
              <button type="button" className="btn-cancelar" onClick={handleCancelar}>
                Cancelar
              </button>
            </div>
          </form>

          <dialog ref={dialog} className="guardado-con-exito">
            <h2>Nueva Versión Guardada con Éxito</h2>
            <p style={{ marginTop: "8px", color: "#475569", fontSize: "0.9rem" }}>
              La versión v{siguienteVersion} ya se encuentra vigente.
            </p>
            <button
              type="button"
              className="btn-guardar"
              onClick={() => {
                dialog.current?.close();
                onSuccess?.();
              }}
            >
              Aceptar
            </button>
          </dialog>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El documento no fue encontrado.</div>
      )}
    </div>
  );
}
