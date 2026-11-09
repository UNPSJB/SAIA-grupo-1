import React, { useEffect, useState } from "react";
import type { ControlAmbientalConHistorial, VisitaControl } from "./tipos";
import { apiFetch } from "../../api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import "../../styles/formularioAlta.css";

interface ModalHistorialVisitasProps {
  isOpen: boolean;
  onClose: () => void;
  controlId: number | null;
  tipoLabel?: string;
}

const formatearFecha = (str?: string | null) => {
  if (!str) return "—";
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("es-AR");
  } catch {
    return str;
  }
};

export const ModalHistorialVisitas: React.FC<ModalHistorialVisitasProps> = ({
  isOpen,
  onClose,
  controlId,
  tipoLabel,
}) => {
  const [visitas, setVisitas] = useState<VisitaControl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para el visor de comprobante / certificado
  const [modalArchivoAbierto, setModalArchivoAbierto] = useState(false);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>("comprobante");
  const [esPdf, setEsPdf] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);

  useEffect(() => {
    if (!isOpen || !controlId) return;

    const cargarHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/controles-ambientales/${controlId}`);
        if (!res.ok) throw new Error("No se pudo cargar el historial.");
        const data: ControlAmbientalConHistorial = await res.json();
        setVisitas(data.visitas || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    cargarHistorial();
  }, [isOpen, controlId]);

  const handleVerComprobante = async (visita: VisitaControl) => {
    if (!visita.certificado_url) return;

    setCargandoArchivo(true);
    setModalArchivoAbierto(true);
    setNombreArchivo(`comprobante_visita_${visita.id}`);

    try {
      const res = await apiFetch(visita.certificado_url);
      if (res.ok) {
        const rawBlob = await res.blob();
        const contentType = res.headers.get("content-type") || "";
        const esFormatoPdf =
          contentType.includes("pdf") || visita.certificado_url.toLowerCase().endsWith(".pdf");

        const blob = new Blob([rawBlob], { type: esFormatoPdf ? "application/pdf" : contentType });
        const urlCreada = window.URL.createObjectURL(blob);

        setEsPdf(esFormatoPdf);
        setArchivoUrl(urlCreada);
      } else {
        alert("No se pudo cargar el comprobante adjunto.");
        setModalArchivoAbierto(false);
      }
    } catch (err) {
      console.error("Error al cargar archivo:", err);
      alert("Error al descargar el comprobante.");
      setModalArchivoAbierto(false);
    } finally {
      setCargandoArchivo(false);
    }
  };

  const handleDescargar = () => {
    if (!archivoUrl) return;
    const a = document.createElement("a");
    a.href = archivoUrl;
    a.download = esPdf ? `${nombreArchivo}.pdf` : `${nombreArchivo}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCerrarVisor = () => {
    if (archivoUrl) {
      window.URL.revokeObjectURL(archivoUrl);
    }
    setArchivoUrl(null);
    setModalArchivoAbierto(false);
  };

  if (!isOpen || !controlId) return null;

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-caja modal-caja-amplia">
          <div className="modal-header">
            <div>
              <h2>Historial de Visitas y Certificados</h2>
              {tipoLabel && (
                <div style={{ fontSize: "0.88rem", color: "var(--color-texto-sec)", marginTop: "2px" }}>
                  {tipoLabel}
                </div>
              )}
            </div>
            <button type="button" className="btn-cerrar-modal" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            {error && <div className="alerta-error">{error}</div>}

            <div className="tabla-wrapper" style={{ maxHeight: "55vh", overflowY: "auto" }}>
              <table className="tabla-custom">
                <thead>
                  <tr>
                    <th>Fecha Realización</th>
                    <th>Próximo Vencimiento</th>
                    <th>Observaciones</th>
                    <th>Certificado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                        Cargando historial...
                      </td>
                    </tr>
                  ) : visitas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                        Sin historial de visitas registradas.
                      </td>
                    </tr>
                  ) : (
                    visitas.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>{formatearFecha(v.fecha_realizacion)}</td>
                        <td>{formatearFecha(v.fecha_proximo_vencimiento)}</td>
                        <td>{v.observaciones || "—"}</td>
                        <td>
                          {v.certificado_url ? (
                            <button
                              type="button"
                              onClick={() => handleVerComprobante(v)}
                              className="btn-secundario"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span>📄 Ver Comprobante</span>
                              <span>↗</span>
                            </button>
                          ) : (
                            <span style={{ color: "var(--color-texto-sec)" }}>Sin comprobante</span>
                          )}
                        </td>
                      </tr>
                    ))
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

      {/* Visor modal de comprobante (soporta PDF e imágenes + Descarga) */}
      <Dialog open={modalArchivoAbierto} onOpenChange={(open) => !open && handleCerrarVisor()}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Comprobante / Certificado Adjunto</DialogTitle>
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
            {cargandoArchivo ? (
              <div style={{ color: "var(--color-texto-sec)" }}>Cargando archivo...</div>
            ) : archivoUrl ? (
              esPdf ? (
                <iframe
                  src={archivoUrl}
                  title="Comprobante sanitario"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <img
                  src={archivoUrl}
                  alt="Comprobante sanitario"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )
            ) : (
              <div style={{ color: "var(--color-texto-sec)" }}>
                No se pudo cargar la vista previa del archivo.
              </div>
            )}
          </div>
          <DialogFooter>
            {archivoUrl && (
              <button type="button" className="btn-guardar" onClick={handleDescargar}>
                ⬇ Descargar
              </button>
            )}
            <DialogClose onClick={handleCerrarVisor}>Cerrar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};