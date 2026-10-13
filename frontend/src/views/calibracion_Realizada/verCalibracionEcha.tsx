import { useEffect, useState } from "react";
import type { CalibracionRealizadaConID } from "./tipos";
import { API_URL, apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";

interface VerCalibracionProps {
  calibracionID: number | null;
  onCancel?: () => void;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

export const VerCalibracion: React.FC<VerCalibracionProps> = ({ calibracionID, onCancel }) => {
  const [calibracion, setCalibracion] = useState<CalibracionRealizadaConID | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calibracionID) {
      setCalibracion(null);
      setLoading(false);
      return;
    }

    const fetchCalibracionRealizada = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch(`/calibracion_realizada/${calibracionID}`);

        if (!res.ok) {
          throw new Error("No se pudo obtener la calibración.");
        }

        const data = await res.json();
        setCalibracion(data);
      } catch (err: unknown) {
        setCalibracion(null);
        setError(
          err instanceof Error ? err.message : "La calibración realizada no existe."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCalibracionRealizada();
  }, [calibracionID]);

  const obtenerUrlArchivo = (ruta?: string | null, inline: boolean = false) => {
    if (!ruta) return "";
    const rutaNormalizada = ruta.replace(/\\/g, "/");
    const nombreArchivo = rutaNormalizada.split("/").pop();

    const apiLimpieza = API_URL.trim().endsWith("/")
      ? API_URL.trim().slice(0, -1)
      : API_URL.trim();
    const urlBase = `${apiLimpieza}/calibracion_realizada/archivos/${nombreArchivo}`;

    return inline ? `${urlBase}?inline=true` : urlBase;
  };

  const handleDescargar = () => {
    if (!calibracion?.formato_archivo) return;
    const urlArchivo = obtenerUrlArchivo(calibracion.formato_archivo, false);
    const link = document.createElement("a");
    link.href = urlArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const esPdf = calibracion?.formato_archivo?.toLowerCase().endsWith(".pdf");

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Informe de Calibración</h1>
        <div className="subtitulo">
          {calibracion ? calibracion.nombre_plan_calibracion : `Calibración #${calibracionID}`}
        </div>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando calibración...</div>
      ) : calibracion ? (
        <div className="datos-tarea">
          <div className="form-group">
            <label htmlFor="fecha_d_realizacion">Fecha de Realización</label>
            <input
              id="fecha_d_realizacion"
              type="text"
              value={formatDate(calibracion.fecha_d_realizacion)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_calibracion">Plan de Calibración</label>
            <input
              id="plan_calibracion"
              name="plan_calibracion"
              type="text"
              value={calibracion.nombre_plan_calibracion}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Certificado o Evidencia Adjunta</label>
            {calibracion.formato_archivo ? (
              <div
                style={{
                  marginTop: "0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxHeight: "260px",
                    backgroundColor: "var(--color-fondo)",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    border: "1px solid var(--color-borde)",
                    textAlign: "center",
                    overflow: "hidden",
                  }}
                >
                  {esPdf ? (
                    <iframe
                      src={obtenerUrlArchivo(calibracion.formato_archivo, true)}
                      title="Certificado PDF"
                      style={{ width: "100%", height: "240px", border: "none" }}
                    />
                  ) : (
                    <img
                      src={obtenerUrlArchivo(calibracion.formato_archivo, true)}
                      alt="Evidencia de calibración"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "230px",
                        objectFit: "contain",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="btn-guardar"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.9rem" }}
                  onClick={handleDescargar}
                >
                  📥 Descargar Archivo
                </button>
              </div>
            ) : (
              <p style={{ color: "var(--color-texto-sec)", fontStyle: "italic" }}>
                No hay archivo adjunto para este registro.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          La calibración realizada no existe.
        </div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};