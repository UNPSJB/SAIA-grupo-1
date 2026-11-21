import React, { useEffect, useState } from "react";
import type { ConfiguracionPdf, ConfiguracionPdfUpdate } from "./tipos";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";

const MAX_ENCABEZADO = 200;
const MAX_PIE = 200;
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const FORMATOS_PERMITIDOS = ["image/png", "image/jpeg"];
const EXTENSIONES_PERMITIDAS = [".png", ".jpg", ".jpeg"];
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const CONFIG_INICIAL: ConfiguracionPdf = {
  encabezado: "",
  logo: "",
  pie_dePagina: "",
  tipo_letra: "Sans_serif",
};

const OPCIONES_FUENTE = [
  { value: "Sans_serif", label: "Sans Serif (Moderna / Limpia)" },
  { value: "Serif", label: "Serif (Clásica / Editorial)" },
  { value: "Slab_serif", label: "Slab Serif (Técnica / Marcada)" },
];

interface ConfiguracionPdfProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

function esLogoValido(valor: string): boolean {
  const limpio = valor.trim();
  if (!limpio) return true;
  try {
    const url = new URL(limpio);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  } catch {
    if (
      !limpio.startsWith("/") &&
      !limpio.startsWith("uploads/") &&
      !limpio.startsWith("static/") &&
      !limpio.startsWith("archivos/")
    ) {
      return false;
    }
  }
  const sinQuery = limpio.split("?")[0].toLowerCase();
  return EXTENSIONES_PERMITIDAS.some((ext) => sinQuery.endsWith(ext));
}

function resolverUrlLogo(logo: string | null | undefined): string | null {
  if (!logo) return null;
  const limpio = logo.trim();
  if (!limpio) return null;
  if (
    limpio.startsWith("http://") ||
    limpio.startsWith("https://") ||
    limpio.startsWith("blob:") ||
    limpio.startsWith("data:")
  ) {
    return limpio;
  }
  const rutaRelativa = limpio.startsWith("/") ? limpio : `/${limpio}`;
  return `${API_BASE_URL}${rutaRelativa}`;
}

function obtenerCssFontFamily(tipoLetra: string | null | undefined): string {
  const valor = (tipoLetra || "").trim().toLowerCase();
  if (valor.includes("serif") && !valor.includes("sans") && !valor.includes("slab")) {
    return 'Georgia, "Times New Roman", Times, serif';
  }
  if (valor.includes("slab")) {
    return '"Courier New", Courier, monospace';
  }
  return 'Arial, Helvetica, sans-serif';
}

export default function ConfiguracionPdf({ onSuccess, onCancel }: ConfiguracionPdfProps) {
  const [config, setConfig] = useState<ConfiguracionPdf>(CONFIG_INICIAL);
  const [previewLocalLogo, setPreviewLocalLogo] = useState<string | null>(null);
  const [existeDiseno, setExisteDiseno] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

  useEffect(() => {
    return () => {
      if (previewLocalLogo && previewLocalLogo.startsWith("blob:")) {
        URL.revokeObjectURL(previewLocalLogo);
      }
    };
  }, [previewLocalLogo]);

  useEffect(() => {
    let cancelado = false;
    async function cargarConfiguracion() {
      setCargandoInicial(true);
      setErrorMsg(null);
      try {
        const res = await apiFetch("/pdfs/");
        if (!res.ok) {
          throw new Error("No se pudo obtener la configuración actual de PDF.");
        }
        const data: ConfiguracionPdf = await res.json();
        if (!cancelado) {
          const tieneDatos = Boolean(
            data.encabezado || data.logo || data.pie_dePagina || data.tipo_letra
          );
          setExisteDiseno(tieneDatos);
          setConfig({
            id: data.id,
            encabezado: data.encabezado ?? "",
            logo: data.logo ?? "",
            pie_dePagina: data.pie_dePagina ?? "",
            tipo_letra: data.tipo_letra ?? "Sans_serif",
          });
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setErrorMsg(
            err instanceof Error ? err.message : "Error al cargar la configuración del PDF."
          );
        }
      } finally {
        if (!cancelado) {
          setCargandoInicial(false);
        }
      }
    }
    cargarConfiguracion();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "logo" && previewLocalLogo) {
      URL.revokeObjectURL(previewLocalLogo);
      setPreviewLocalLogo(null);
    }
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleArchivoLogo(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const nombreMinuscula = file.name.toLowerCase();
    const tieneExtValida = EXTENSIONES_PERMITIDAS.some((ext) =>
      nombreMinuscula.endsWith(ext)
    );
    const tieneMimeValido = FORMATOS_PERMITIDOS.includes(file.type);

    if (!tieneExtValida || !tieneMimeValido) {
      setErrorMsg("El logo solo admite formatos PNG o JPG.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg("El logo no puede superar los 2 MB.");
      e.target.value = "";
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setPreviewLocalLogo(blobUrl);

    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append("archivo_logo", file);

      const res = await apiFetch("/pdfs/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : "No se pudo subir el logo."
        );
      }

      const actualizada: ConfiguracionPdf = await res.json();
      setConfig((prev) => ({
        ...prev,
        id: actualizada.id ?? prev.id,
        logo: actualizada.logo ?? "",
      }));
      setExisteDiseno(true);
      setSuccessMsg("Logo actualizado correctamente.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al subir el logo."
      );
    } finally {
      setGuardando(false);
      e.target.value = "";
    }
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const encabezadoLimpio = (config.encabezado || "").trim();
    const pieLimpio = (config.pie_dePagina || "").trim();
    const logoLimpio = (config.logo || "").trim();

    if (encabezadoLimpio.length > MAX_ENCABEZADO) {
      setErrorMsg(`El encabezado no puede superar los ${MAX_ENCABEZADO} caracteres.`);
      return;
    }

    if (pieLimpio.length > MAX_PIE) {
      setErrorMsg(`El pie de página no puede superar los ${MAX_PIE} caracteres.`);
      return;
    }

    if (logoLimpio && !esLogoValido(logoLimpio)) {
      setErrorMsg(
        "La URL o ruta del logo debe apuntar a una imagen válida en formato .png, .jpg o .jpeg."
      );
      return;
    }

    const payload: ConfiguracionPdfUpdate = {
      encabezado: encabezadoLimpio || null,
      pie_dePagina: pieLimpio || null,
      logo: logoLimpio || null,
      tipo_letra: config.tipo_letra || "Sans_serif",
    };

    setGuardando(true);
    try {
      const res = await apiFetch("/pdfs/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : "No se pudo guardar la configuración del PDF."
        );
      }

      const actualizada: ConfiguracionPdf = await res.json();
      setConfig({
        id: actualizada.id,
        encabezado: actualizada.encabezado ?? "",
        logo: actualizada.logo ?? "",
        pie_dePagina: actualizada.pie_dePagina ?? "",
        tipo_letra: actualizada.tipo_letra ?? "Sans_serif",
      });
      setExisteDiseno(true);
      setSuccessMsg("Configuración de PDF guardada correctamente.");
      setExitoDialogAbierto(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error de conexión con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  const urlLogoVistaPrevia = previewLocalLogo
    ? previewLocalLogo
    : config.logo && esLogoValido(config.logo)
    ? resolverUrlLogo(config.logo)
    : null;

  const fuentePreview = obtenerCssFontFamily(config.tipo_letra);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>{existeDiseno ? "Editar Diseño de PDF" : "Configurar Diseño de PDF"}</h1>
        <div className="subtitulo">
          {existeDiseno
            ? `Diseño activo (ID #${config.id ?? 1}) · Aplica a todas las exportaciones`
            : "Primer diseño · Aplica a todas las exportaciones"}
        </div>
      </div>

      {cargandoInicial ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Cargando configuración actual...
        </div>
      ) : (
        <>
          {errorMsg && <div className="alerta-error">{errorMsg}</div>}
          {successMsg && <div className="alerta-exito">{successMsg}</div>}

          <form onSubmit={handleGuardar}>
            <div className="form-group">
              <label htmlFor="encabezado">
                Encabezado del PDF ({(config.encabezado || "").length}/{MAX_ENCABEZADO})
              </label>
              <input
                id="encabezado"
                name="encabezado"
                type="text"
                placeholder="Ej: Sistema de Gestión de Inocuidad Alimentaria"
                value={config.encabezado || ""}
                onChange={handleChange}
                maxLength={MAX_ENCABEZADO}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pie_dePagina">
                Pie de Página ({(config.pie_dePagina || "").length}/{MAX_PIE})
              </label>
              <input
                id="pie_dePagina"
                name="pie_dePagina"
                type="text"
                placeholder="Ej: Documento generado automáticamente - Uso interno"
                value={config.pie_dePagina || ""}
                onChange={handleChange}
                maxLength={MAX_PIE}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tipo_letra">Tipo de Letra</label>
              <select
                id="tipo_letra"
                name="tipo_letra"
                value={config.tipo_letra || "Sans_serif"}
                onChange={handleChange}
              >
                {OPCIONES_FUENTE.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="logo">URL del Logo (PNG o JPG)</label>
              <input
                id="logo"
                name="logo"
                type="text"
                placeholder="https://.../logo.png o /pdfs/logos/logo_empresa.png"
                value={config.logo || ""}
                onChange={handleChange}
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="archivo_logo">Agregar Logo desde la Computadora (PNG / JPG)</label>
              <input
                id="archivo_logo"
                name="archivo_logo"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleArchivoLogo}
              />
            </div>

            {/* Previsualización de hoja A4 horizontal */}
            <div style={{ marginTop: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "#475569",
                }}
              >
                Previsualización aproximada del PDF (A4 Horizontal · {config.tipo_letra || "Sans_serif"})
              </div>

              <div
                style={{
                  width: "100%",
                  aspectRatio: "297 / 210",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontFamily: fuentePreview,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
                  boxSizing: "border-box",
                }}
              >
                {/* Encabezado + Logo */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "0.45rem",
                    minHeight: "32px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: config.encabezado ? "#475569" : "#94a3b8",
                      fontStyle: config.encabezado ? "normal" : "italic",
                    }}
                  >
                    {config.encabezado || "Encabezado del reporte"}
                  </span>

                  {urlLogoVistaPrevia ? (
                    <img
                      src={urlLogoVistaPrevia}
                      alt="Logo PDF"
                      style={{
                        maxHeight: "26px",
                        maxWidth: "85px",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        border: "1px dashed #cbd5e1",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                      }}
                    >
                      Logo
                    </span>
                  )}
                </div>

                {/* Cuerpo de ejemplo del reporte */}
                <div style={{ flex: 1, padding: "0.85rem 0" }}>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: "0.65rem",
                    }}
                  >
                    Título de Ejemplo del Reporte
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.75rem",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                        <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>Código</th>
                        <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>Descripción</th>
                        <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "#ffffff" }}>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          REG-001
                        </td>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          Registro de muestra para visualizar la tipografía
                        </td>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          Vigente
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          REG-002
                        </td>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          Segunda fila de ejemplo en el documento
                        </td>
                        <td style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                          Completado
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pie de página */}
                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "0.4rem",
                    fontSize: "0.75rem",
                    color: config.pie_dePagina ? "#475569" : "#94a3b8",
                    fontStyle: config.pie_dePagina ? "normal" : "italic",
                  }}
                >
                  {config.pie_dePagina || "Pie de página del reporte"}
                </div>
              </div>
            </div>

            <div className="form-acciones">
              <button type="submit" className="btn-guardar" disabled={guardando}>
                {guardando
                  ? "Guardando..."
                  : existeDiseno
                  ? "Guardar Cambios"
                  : "Guardar Diseño"}
              </button>
              {onCancel && (
                <button type="button" className="btn-cancelar" onClick={onCancel}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </>
      )}

      <SuccessAlertDialog
        open={exitoDialogAbierto}
        title="Configuración guardada"
        description="El diseño del PDF se actualizó y aplicará a las próximas exportaciones."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}