import React, { useState } from "react";
import { apiFetch } from "../../api/client";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";
import "../../styles/formularioAlta.css";

interface NuevoControlProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoControlAmbiental({ onSuccess, onCancel }: NuevoControlProps) {
  const [tipo, setTipo] = useState<string>("CONTROL_PLAGAS");
  const [periodicidadDias, setPeriodicidadDias] = useState<number>(30);
  const [observaciones, setObservaciones] = useState("");
  const [fechaInicial, setFechaInicial] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (periodicidadDias <= 0) {
      setErrorMsg("La periodicidad debe ser un número entero mayor a cero.");
      return;
    }

    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("periodicidad_dias", String(periodicidadDias));
    if (observaciones.trim()) formData.append("observaciones", observaciones.trim());
    if (fechaInicial) formData.append("fecha_realizacion_inicial", fechaInicial);
    if (archivo) formData.append("archivo", archivo);

    setLoading(true);

    try {
      const res = await apiFetch("/controles-ambientales", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Error al crear el control ambiental.");
      }

      setExitoDialogAbierto(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Control Ambiental</h1>
        <div className="subtitulo">02 · Configuración y Primera Visita</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="tipo">Tipo de Control</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
            <option value="CONTROL_PLAGAS">Control de Plagas</option>
            <option value="ANALISIS_AGUA">Análisis de Agua</option>
            <option value="LIMPIEZA_TANQUE">Limpieza de Tanque</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="periodicidad">Periodicidad (en días)</label>
          <input
            id="periodicidad"
            type="number"
            min="1"
            required
            value={periodicidadDias}
            onChange={(e) => setPeriodicidadDias(Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaInicial">Fecha Primera Visita (Opcional)</label>
          <input
            id="fechaInicial"
            type="date"
            value={fechaInicial}
            onChange={(e) => setFechaInicial(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="archivo">Certificado Adjunto (PDF o Imagen, opcional)</label>
          <input
            id="archivo"
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="obs">Observaciones (Opcional)</label>
          <textarea
            id="obs"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar Control"}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>

      <SuccessAlertDialog
        open={exitoDialogAbierto}
        title="Control registrado con éxito"
        description="La configuración del control y su vencimiento automático fueron creados correctamente."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}