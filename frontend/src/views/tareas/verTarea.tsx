import { useEffect, useState } from "react";
import type { TareaConId} from "./tipos";
import { apiFetch } from '../../api/client';
import "../../styles/formularioAlta.css";interface VerTareaProps {
    tareaID:number | null;
    onCancel?: () => void;

}


export const VerTarea : React.FC<VerTareaProps> = ({tareaID, onCancel}) =>{
    const [tarea, setTarea] = useState<TareaConId | null>(null);
    const [loading, setLoading] = useState(false);



useEffect(() => {
        if (tareaID) {
            const fetchTarea = async () => {
                try {
                    const res = await apiFetch(`/tareas/${tareaID}`);
                    if (res.ok) {
                        const data = await res.json();
                        setTarea(data);
                    }
                } catch {
                    alert('la tarea no existe.');
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
        <h1>Tarea</h1>
      </div>

        {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando tarea ...
                            </td>
                        </tr>
        ) : tarea ? (

        <div>

        <div className="datos-tarea">

        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={tarea.nombre}
            disabled
          />
        </div>

        <div className="form-group">
                <label htmlFor="frecuencia">Frecuencia:</label>
                <input
                    id="frecuencia"
                    name="frecuencia"
                    value={tarea.frecuencia}
                    disabled
                >
                </input>
            </div>

        </div>

        <div className="form-group procedimiento">
          <label htmlFor="descripcion">Procedimiento</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={tarea.descripcion}
            rows={8}
            disabled
          />
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
    </div>
  )
};