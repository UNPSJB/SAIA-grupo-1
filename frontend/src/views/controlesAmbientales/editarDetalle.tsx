import React, { useEffect, useState } from "react";
import type { ControlAmbiental, TipoControlAmbiental } from "./tipos";
import { apiFetch } from "../../api/client";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";
import "../../styles/formularioAlta.css";

interface EditarControlProps {
  controlId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const getTipoLabel = (tipo?: TipoControlAmbiental | null): string => {
  if (!tipo) return "—";
  switch (tipo) {
    case "CONTROL_PLAGAS":
      return "Control de Plagas";
    case "ANALISIS_AGUA":
      return "Análisis de Agua";
    case "LIMPIEZA_TANQUE":
      return "Limpieza de Tanque";
    default:
      return tipo;
  }
};

export const EditarControlAmbiental: React.FC<EditarControlProps> = ({
  controlId,
  onSuccess,
  onCancel,
}) => {
  const [tipo, setTipo] = useState<string>("CONTROL_PLAGAS");
  const [periodicidadDias, setPeriodicidadDias] = useState<number>(30);
  const [observaciones, setObservaciones] = useState("");

  const [loading, setLoading] = useState(Boolean(controlId));
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

  useEffect(() => {
    if (!controlId) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/controles-ambientales/${controlId}`);
        if (!cancelado && res.ok) {
          const data: ControlAmbiental = await res.json();
          setTipo(data.tipo);
          setPeriodicidadDias(data.periodicidad_dias);
          setObservaciones(data.observaciones || "");
        } else if (!cancelado) {
          setErrorMsg("No se pudieron cargar los datos del control ambiental.");
        }
      } catch (err: unknown) {
        if (!cancelado) setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [controlId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (periodicidadDias <= 0) {
      setErrorMsg("La periodicidad debe ser un número entero mayor a cero.");
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        tipo,
        periodicidad_dias: periodicidadDias,
        observaciones: observaciones.trim() || null,
      };

      const res = await apiFetch(`/controles-ambientales/${controlId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Error al actualizar el control ambiental.");
      }

      setExitoDialogAbierto(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Control Ambiental</h1>
        <div className="subtitulo">
          Modificar configuración · {getTipoLabel(tipo)} (ID #{controlId})
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando datos...</div>
      ) : (
        <>
          {errorMsg && <div className="alerta-error">{errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="tipo">Tipo de Control</label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled // Deshabilitado para mantener la restricción de tipo único
              >
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
              <small style={{ color: "var(--color-texto-sec)", fontSize: "0.8rem", marginTop: "4px" }}>
                * Al cambiar la periodicidad, se recalculará automáticamente la próxima fecha de vencimiento.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="obs">Observaciones (Opcional)</label>
              <textarea
                id="obs"
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas técnicas, recomendaciones o datos del proveedor..."
              />
            </div>

            <div className="form-acciones">
              <button type="submit" className="btn-guardar" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button type="button" className="btn-cancelar" onClick={onCancel}>
                Cancelar
              </button>
            </div>
          </form>
        </>
      )}

      <SuccessAlertDialog
        open={exitoDialogAbierto}
        title="Control actualizado con éxito"
        description="Los cambios en la periodicidad y observaciones han sido guardados."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
};