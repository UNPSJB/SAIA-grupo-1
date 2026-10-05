import React, { useEffect, useState } from "react";
import type { DocumentoListItem, PersonalAdmin, TipoDocumento } from "./tipos";
import "./documentos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ModalSubirProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentoPreseleccionado?: DocumentoListItem | null;
  documentosExistentes: DocumentoListItem[];
  personalAdmin: PersonalAdmin[];
}

export const ModalSubir: React.FC<ModalSubirProps> = ({
  isOpen,
  onClose,
  onSuccess,
  documentoPreseleccionado,
  documentosExistentes,
  personalAdmin,
}) => {
  const [modo, setModo] = useState<"nuevo" | "version">("nuevo");
  const [documentoId, setDocumentoId] = useState<number | null>(null);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("MANUAL_BPM");
  const [version, setVersion] = useState("1.0");
  const [descripcion, setDescripcion] = useState("");
  const [responsableLegajo, setResponsableLegajo] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  const [coincidenciaIgnorada, setCoincidenciaIgnorada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setArchivo(null);
    setCoincidenciaIgnorada(false);

    if (personalAdmin.length > 0 && responsableLegajo === null) {
      setResponsableLegajo(personalAdmin[0].legajo);
    }

    if (documentoPreseleccionado) {
      setModo("version");
      setDocumentoId(documentoPreseleccionado.id);
      setVersion("");
    } else {
      setModo("nuevo");
      setTitulo("");
      setTipo("MANUAL_BPM");
      setVersion("1.0");
      setDescripcion("");
      setDocumentoId(documentosExistentes.length > 0 ? documentosExistentes[0].id : null);
    }
  }, [isOpen, documentoPreseleccionado, personalAdmin]);

  if (!isOpen) return null;

  const docSeleccionado = documentosExistentes.find((d) => d.id === documentoId) || documentoPreseleccionado || null;

  const coincidencia =
    modo === "nuevo" && !coincidenciaIgnorada && titulo.trim() !== ""
      ? documentosExistentes.find(
          (d) =>
            d.titulo.toLowerCase().trim() === titulo.toLowerCase().trim() &&
            d.tipo === tipo
        )
      : null;

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().endsWith(".pdf")) {
        setError("Solo se permiten archivos en formato PDF (.pdf)");
        setArchivo(null);
        return;
      }
      setError(null);
      setArchivo(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!responsableLegajo) {
      setError("Debes seleccionar un responsable con permiso de administrar.");
      return;
    }

    if (!archivo) {
      setError("Debes adjuntar un archivo PDF.");
      return;
    }

    if (!version.trim()) {
      setError("Debes indicar un número de versión.");
      return;
    }

    const formData = new FormData();
    formData.append("responsable_legajo", String(responsableLegajo));
    formData.append("version", version.trim());
    formData.append("archivo", archivo);

    setEnviando(true);

    try {
      let endpoint = `${API_URL}/documentos`;
      if (modo === "nuevo") {
        if (!titulo.trim()) {
          setError("El título del documento es obligatorio.");
          setEnviando(false);
          return;
        }
        formData.append("titulo", titulo.trim());
        formData.append("tipo", tipo);
        if (descripcion.trim()) {
          formData.append("descripcion", descripcion.trim());
        }
      } else {
        if (!documentoId) {
          setError("Debes seleccionar el documento a versionar.");
          setEnviando(false);
          return;
        }
        endpoint = `${API_URL}/documentos/${documentoId}/versiones`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "No se pudo procesar la solicitud.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al subir el documento.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-caja">
        <div className="modal-header">
          <h2>
            {documentoPreseleccionado
              ? `Subir Nueva Versión: ${documentoPreseleccionado.titulo}`
              : "Subir Documento"}
          </h2>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alerta-error">{error}</div>}

            {!documentoPreseleccionado && (
              <div className="modo-selector-tabs">
                <button
                  type="button"
                  className={`modo-tab ${modo === "nuevo" ? "activo" : ""}`}
                  onClick={() => {
                    setModo("nuevo");
                    setError(null);
                  }}
                >
                  Documento Nuevo Separado
                </button>
                <button
                  type="button"
                  className={`modo-tab ${modo === "version" ? "activo" : ""}`}
                  onClick={() => {
                    setModo("version");
                    setError(null);
                  }}
                  disabled={documentosExistentes.length === 0}
                >
                  Nueva Versión de Uno Existente
                </button>
              </div>
            )}

            {modo === "nuevo" ? (
              <>
                <div className="form-group">
                  <label htmlFor="doc-tipo">Tipo de Documento</label>
                  <select
                    id="doc-tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoDocumento)}
                    className="select-filtro"
                  >
                    <option value="MANUAL_BPM">Manual de BPM</option>
                    <option value="FICHA_TECNICA">Ficha Técnica</option>
                    <option value="PROCEDIMIENTO">Procedimiento</option>
                    <option value="RECETA">Receta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="doc-titulo">Título del Documento</label>
                  <input
                    id="doc-titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Receta Medialunas de Manteca, Manual BPM 2026..."
                    required
                  />
                </div>

                {coincidencia && (
                  <div className="alerta-coincidencia">
                    <div>
                      <strong>Aviso de coincidencia:</strong> Ya existe un documento activo de tipo{" "}
                      <strong>{coincidencia.tipo}</strong> con el título{" "}
                      <strong>"{coincidencia.titulo}"</strong> (versión actual: {coincidencia.version_actual || "1.0"}).
                    </div>
                    <div className="alerta-coincidencia-acciones">
                      <button
                        type="button"
                        className="btn-mini-confirmar"
                        onClick={() => {
                          setModo("version");
                          setDocumentoId(coincidencia.id);
                          setVersion("");
                        }}
                      >
                        Subir como nueva versión de este documento
                      </button>
                      <button
                        type="button"
                        className="btn-mini-confirmar"
                        style={{ backgroundColor: "#e2e8f0", borderColor: "#cbd5e1", color: "#334155" }}
                        onClick={() => setCoincidenciaIgnorada(true)}
                      >
                        Es un documento nuevo separado
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="doc-descripcion">Descripción (opcional)</label>
                  <textarea
                    id="doc-descripcion"
                    rows={2}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Notas o alcance del documento..."
                  />
                </div>
              </>
            ) : (
              <>
                {!documentoPreseleccionado && (
                  <div className="form-group">
                    <label htmlFor="doc-seleccion">Documento Existente a Versionar</label>
                    <select
                      id="doc-seleccion"
                      value={documentoId || ""}
                      onChange={(e) => setDocumentoId(Number(e.target.value))}
                      className="select-filtro"
                    >
                      {documentosExistentes.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.tipo}] {d.titulo} (v{d.version_actual || "1.0"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {docSeleccionado && (
                  <div className="alerta-confirmacion-archivado">
                    <div>
                      Subirás una nueva versión para <strong>"{docSeleccionado.titulo}"</strong>.
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      La versión actual (<strong>v{docSeleccionado.version_actual || "1.0"}</strong>) quedará archivada automáticamente sin sobrescribirse.
                      Los demás documentos de tipo <strong>{docSeleccionado.tipo}</strong> permanecerán activos e inalterados.
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label htmlFor="doc-version">Número de Versión</label>
              <input
                id="doc-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ej. 1.0, 1.1, 2.0..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="doc-responsable">Responsable (Administrador)</label>
              <select
                id="doc-responsable"
                value={responsableLegajo || ""}
                onChange={(e) => setResponsableLegajo(Number(e.target.value))}
                className="select-filtro"
                required
              >
                {personalAdmin.map((p) => (
                  <option key={p.legajo} value={p.legajo}>
                    {p.nombre} {p.apellido} (Legajo {p.legajo} - {p.capacidad})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Archivo del Documento (PDF)</label>
              <div
                className="file-input-wrapper"
                onClick={() => document.getElementById("input-pdf-file")?.click()}
              >
                <input
                  id="input-pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleArchivoChange}
                />
                <div className="file-input-label">
                  <span className="file-input-icono">📄</span>
                  <span>Haz clic aquí para seleccionar el archivo PDF</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Formato PDF obligatorio. Máximo 20 MB.
                  </span>
                  {archivo && (
                    <div className="archivo-seleccionado-info">
                      ✓ Seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>
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
              disabled={enviando}
            >
              {enviando
                ? "Subiendo..."
                : modo === "nuevo"
                ? "Guardar Documento"
                : "Confirmar y Subir Nueva Versión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
