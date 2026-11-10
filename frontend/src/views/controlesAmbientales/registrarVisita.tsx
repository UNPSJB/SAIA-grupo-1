import React, { useState } from "react";
import type { ControlAmbiental } from "./tipos";
import { apiFetch } from "../../api/client";

interface ModalRegistrarVisitaProps {
  isOpen: boolean;
  onClose: () => void;
  control: ControlAmbiental;
  onSuccess: () => void;
}

export const ModalRegistrarVisita: React.FC<ModalRegistrarVisitaProps> = ({
  isOpen,
  onClose,
  control,
  onSuccess,
}) => {
  // Calculamos la fecha de hoy en formato local YYYY-MM-DD para evitar desfases de zona horaria
  const obtenerFechaHoy = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fechaHoyStr = obtenerFechaHoy();

  const [fechaRealizacion, setFechaRealizacion] = useState(fechaHoyStr);
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      const ext = f.name.toLowerCase();
      const esValido =
        ext.endsWith(".pdf") ||
        ext.endsWith(".png") ||
        ext.endsWith(".jpg") ||
        ext.endsWith(".jpeg") ||
        ext.endsWith(".webp");

      if (!esValido) {
        setErrorMsg("Formato de archivo no permitido. Solo se aceptan archivos PDF (.pdf) o imágenes (.png, .jpg, .jpeg, .webp).");
        setArchivo(null);
        e.target.value = "";
        return;
      }

      setErrorMsg(null);
      setArchivo(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fechaRealizacion) {
      setErrorMsg("Debe especificar la fecha de realización.");
      return;
    }

    // Validación de fecha futura
    if (fechaRealizacion > fechaHoyStr) {
      setErrorMsg("La fecha de realización no puede ser posterior al día de hoy.");
      return;
    }

    if (!archivo) {
      setErrorMsg("Es obligatorio adjuntar el certificado (PDF o imagen) de la visita.");
      return;
    }

    const formData = new FormData();
    formData.append("fecha_realizacion", fechaRealizacion);
    formData.append("archivo", archivo);
    if (observaciones.trim()) formData.append("observaciones", observaciones.trim());

    setLoading(true);

    try {
      const res = await apiFetch(`/controles-ambientales/${control.id}/visitas`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Error al registrar la visita.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-caja">
        <div className="modal-header">
          <h2>Registrar Visita / Control</h2>
          <button type="button" className="btn-cerrar-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            <div className="form-group">
              <label>Tipo de Control</label>
              <input type="text" value={control.tipo.replace("_", " ")} disabled />
            </div>

            <div className="form-group">
              <label htmlFor="fecha_realizacion">Fecha de Realización</label>
              <input
                id="fecha_realizacion"
                type="date"
                required
                max={fechaHoyStr} // Bloquea los días futuros en el calendario del navegador
                value={fechaRealizacion}
                onChange={(e) => setFechaRealizacion(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="archivo">Certificado (PDF o Imagen)</label>
              <input
                id="archivo"
                type="file"
                accept=".pdf,image/*"
                onChange={handleArchivoChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="obs">Observaciones (opcional)</label>
              <textarea
                id="obs"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Nº de acta, observaciones técnicas o empresa prestadora..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Visita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};