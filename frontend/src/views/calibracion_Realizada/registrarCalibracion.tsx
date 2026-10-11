import { useState, useRef } from "react";
import "../../styles/formularioAlta.css";
import type { CalibracionRealizadaForm } from "./tipos";
import { apiFetch } from "../../api/client";

const CalibracionRealizadaINICIAL: CalibracionRealizadaForm = {
    plan_calibracion_id: "",
    fecha_d_realizacion: "",
    formato_archivo: ""
};

const HOY = new Date().toISOString().split("T")[0];

interface NuevaCalibracionRealizadaProps {
    planID?:number | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function RegistrarCalibracion({ onSuccess,planID, onCancel }: NuevaCalibracionRealizadaProps) {
    const [calibracionRealizada, setCalibracionRealizada] = useState<CalibracionRealizadaForm>(CalibracionRealizadaINICIAL);
    const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setCalibracionRealizada({ ...calibracionRealizada, [e.target.name]: e.target.value });
    }

    async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (calibracionRealizada.fecha_d_realizacion < HOY) {
            setErrorMsg("La fecha de realización no puede ser anterior a la fecha actual.");
            return;
        }

        setLoading(true);

        try {
            let rutaArchivo = "";

            if (archivoSeleccionado) {
                const formData = new FormData();
                formData.append("formato_archivo", archivoSeleccionado);

                const resUpload = await apiFetch("/calibracion_realizada/upload-certificado", {
                    method: 'POST',
                    body: formData,
                });

                if (!resUpload.ok) {
                    throw new Error("Error al subir el archivo adjunto.");
                }

                const uploadData = await resUpload.json();
                rutaArchivo = typeof uploadData === "string" ? uploadData : (uploadData.ruta || uploadData.path || "");
            }

            const payload = {
                plan_calibracion_id: planID,
                fecha_d_realizacion: calibracionRealizada.fecha_d_realizacion,
                formato_archivo: rutaArchivo,
            };

            const res = await apiFetch(`/calibracion_realizada/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                let mensaje = "Error al registrar la calibración.";

                if (typeof errorData.detail === "string") {
                    mensaje = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    mensaje = errorData.detail
                        .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                        .join(", ");
                }
                throw new Error(mensaje);
            }

            setSuccessMsg("Calibración Registrada exitosamente");
            setCalibracionRealizada(CalibracionRealizadaINICIAL);
            setArchivoSeleccionado(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            onSuccess?.();

        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    }

    function handleCancelar() {
        setCalibracionRealizada(CalibracionRealizadaINICIAL);
        setArchivoSeleccionado(null);
        setErrorMsg(null);
        setSuccessMsg(null);
        onCancel?.();
    }

    return (
        <div className="modulo-container formulario-box">
            <div className="modulo-header">
                <h1>Registrar Calibración Completada</h1>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}
            {successMsg && <div className="alerta-exito">{successMsg}</div>}

            <form onSubmit={handleGuardar}>


                <div className="form-group">
                    <label htmlFor="fecha_d_realizacion">Fecha de Realización</label>
                    <input
                        id="fecha_d_realizacion"
                        name="fecha_d_realizacion"
                        type="date"
                        min={HOY}
                        value={calibracionRealizada.fecha_d_realizacion}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="formato_archivo">Certificado o Evidencia (PDF, PNG, JPG)</label>
                    <input
                        id="formato_archivo"
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                                const esPdf = f.type === 'application/pdf';
                                const esImagen = f.type.startsWith('image/');

                                if (!esPdf && !esImagen) {
                                    setErrorMsg('El archivo debe ser un documento PDF o una imagen válida (JPG, PNG).');
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                    return;
                                }
                                setErrorMsg(null);
                                setArchivoSeleccionado(f);
                            }
                        }}
                        style={{ marginTop: '0.35rem' }}
                    />
                    {archivoSeleccionado && (
                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                                ✓ Archivo seleccionado: {archivoSeleccionado.name}
                            </span>
                            <button
                                type="button"
                                className="btn-cancelar"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                    setArchivoSeleccionado(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                            >
                                Quitar
                            </button>
                        </div>
                    )}
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
        </div>
    );
}