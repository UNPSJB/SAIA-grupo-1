import React, { useRef, useState } from "react";
import type { TipoDocumento } from "./tipos";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";


interface NuevoDocumentoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoDocumento({ onSuccess, onCancel }: NuevoDocumentoProps) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("MANUAL_BPM");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

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

    if (!titulo.trim()) {
      setErrorMsg("El título del documento es obligatorio.");
      return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo.trim());
    formData.append("tipo", tipo);
    formData.append("version", "1");
    formData.append("archivo", archivo);
    if (descripcion.trim()) {
      formData.append("descripcion", descripcion.trim());
    }

    setLoading(true);

    try {
      const res = await apiFetch("/documentos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al procesar el documento.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Documento creado exitosamente.");
      dialog.current?.showModal();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
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
        <h1>Nuevo Documento</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="tipo">Tipo de Documento</label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumento)}
            required
          >
            <option value="MANUAL_BPM">Manual de BPM</option>
            <option value="FICHA_TECNICA">Ficha Técnica</option>
            <option value="PROCEDIMIENTO">Procedimiento</option>
            <option value="RECETA">Receta</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            type="text"
            placeholder="Introduzca el título del documento"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción (opcional)</label>
          <textarea
            id="descripcion"
            rows={3}
            placeholder="Notas o alcance del documento"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--code-bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "0.95rem",
              color: "var(--text-h)",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="version">Versión</label>
          <input
            id="version"
            type="text"
            value={1}
            disabled
            style={{ opacity: 0.8, cursor: "not-allowed" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="archivo">Archivo PDF {archivo && `(${(archivo.size / 1024).toFixed(1)} KB)`}</label>
          <input
            id="archivo"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleArchivoChange}
            required
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      <dialog ref={dialog} className="guardado-con-exito">
        <h2>Documento Guardado con Éxito</h2>
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
    </div>
  );
}
