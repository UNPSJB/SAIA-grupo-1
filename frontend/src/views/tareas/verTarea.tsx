import { useEffect, useState } from "react";
import type { TareaConId } from "./tipos";
import { apiFetch } from "../../api/client";
import "../../styles/formularioAlta.css";

interface VerTareaProps {
  tareaID: number | null;
  onCancel?: () => void;
}

export const VerTarea: React.FC<VerTareaProps> = ({ tareaID, onCancel }) => {
  const [tarea, setTarea] = useState<TareaConId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tareaID) {
      const fetchTarea = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiFetch(`/tareas/${tareaID}`);
          if (res.ok) {
            const data = await res.json();
            setTarea(data);
          } else {
            setError("No se pudo cargar la tarea.");
          }
        } catch {
          setError("La tarea no existe.");
        } finally {
          setLoading(false);
        }
      };

      fetchTarea();
    }
  }, [tareaID]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Tarea</h1>
        <div className="subtitulo">
          {tarea ? tarea.nombre : `Tarea #${tareaID}`}
        </div>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando tarea...</div>
      ) : tarea ? (
        <div>
          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" value={tarea.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="frecuencia">Frecuencia</label>
            <input
              id="frecuencia"
              name="frecuencia"
              type="text"
              value={tarea.frecuencia}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="responsable">Personal a Cargo</label>
            <input
              id="responsable"
              name="responsable"
              type="text"
              value={tarea.nombre_personal ?? "Sin asignar"}
              disabled
            />
          </div>

          <div className="form-group procedimiento">
            <label htmlFor="descripcion">Procedimiento</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={tarea.descripcion}
              rows={5}
              disabled
            />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>La tarea no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};