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


export const VerCalibracion : React.FC<VerCalibracionProps> = ({calibracionID, onCancel}) =>{
    const [calibracion, setCalibracion] = useState<CalibracionRealizadaConID | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalArchivoUrl, setModalArchivoUrl] = useState<string | null>(null);

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
  
    const link = document.createElement('a');
    link.href = urlArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const renderBotonArchivo = (fotoUrl?: string | null) => {
    if (!fotoUrl) {
      return <span style={{ color: 'var(--color-texto-sec)' }}>Sin archivo</span>;
    }

    const esPdf = fotoUrl.toLowerCase().endsWith('.pdf');

    return (
      <button
        type="button"
        onClick={() => setModalArchivoUrl(obtenerUrlArchivo(fotoUrl, true))}
        style={{
          background: 'none',
          border: 'none',
          padding: '0.1rem 0.3rem',
          cursor: 'pointer',
          color: 'var(--color-primario-texto)',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          whiteSpace: 'nowrap',
          fontSize: '1rem', 
        }}
        title="Ver evidencia"
      >
        <span>{esPdf ? 'Ver documento' : 'Ver imagen'}</span>
        <span style={{ fontSize: '0.75rem' }}>↗</span>
      </button>
    );
  };

 const modalEsPdf = modalArchivoUrl?.toLowerCase().includes('.pdf');
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <label style={{ margin: 0 }}>Certificado</label>
        {renderBotonArchivo(calibracion.formato_archivo)}
    </div>

    {calibracion.formato_archivo ? (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', width: '100%' }}>
            
            <div style={{ width: '100%', height: '220px', backgroundColor: 'var(--color-fondo)', borderRadius: '8px', border: '1px solid var(--color-borde)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {calibracion.formato_archivo.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '3rem' }}>📄</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: '500', wordBreak: 'break-all' }}>
                            {calibracion.formato_archivo.replace(/\\/g, '/').split('/').pop()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Documento PDF Adjunto</span>
                    </div>
                ) : (
                    <img 
                        src={obtenerUrlArchivo(calibracion.formato_archivo, true)} 
                        alt="Evidencia de calibración" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} 
                    />
                )}
            </div>

            <button
                type="button"
                className="btn-guardar"
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={handleDescargar}
            >
                📥 Descargar Archivo
            </button>
        </div>
    ) : (
        <p style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: '0.5rem' }}>No hay archivo adjunto para este registro.</p>
    )}
</div>

            </div>

            ):(
                <tr>
                     <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                             la tarea no existe.
                        </td>
                </tr>
            )
        }

        <div className="form-acciones">
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            volver
          </button>
        </div>


        {modalArchivoUrl && (
        <div
          onClick={() => setModalArchivoUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--color-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-superficie)',
              borderRadius: '8px',
              maxWidth: '750px',
              width: '100%',
              padding: '1.25rem',
              boxShadow: '0 20px 25px -5px color-mix(in srgb, var(--color-sombra) 20%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--color-texto)',
                }}
              >
                Archivo
              </h2>
              <button
                type="button"
                onClick={() => setModalArchivoUrl(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'var(--color-superficie)',
                  border: '1px solid var(--color-texto)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-texto)',
                  cursor: 'pointer',
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '75vh',
                overflow: 'hidden',
                borderRadius: '6px',
              }}
            >
              {modalEsPdf ? (
  <iframe
    src={modalArchivoUrl}
    title="Documento adjunto"
    style={{
      width: '100%',
      height: '65vh',
      border: 'none',
      borderRadius: '6px',
    }}
  />
) : (
                    <img
                      src={modalArchivoUrl}
                      alt="Comprobante de certificado"
                      style={{
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      borderRadius: '6px',
                     }}
                  />
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
