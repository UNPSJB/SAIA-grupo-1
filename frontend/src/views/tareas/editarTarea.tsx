import { useEffect, useState } from "react";
import type { TareaConId} from "./tipos";
import "../../styles/formularioAlta.css";

const TAREA_INICIAL:TareaConId ={
    id:0,
    nombre:"",
    descripcion:"",
    plan_id:0,
    frecuencia:""
} 

const FRECUENCIA = ["diaria","semanal","mensual"]

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";


interface EditarTareaProps {
    tareaID:number | null;
    planID:number | null;
    onSuccess?: () => void;
    onCancel?: () => void;

}


export default function EditarTarea({tareaID, planID,onSuccess, onCancel}: EditarTareaProps){
    const [tarea, setTarea] = useState<TareaConId>(TAREA_INICIAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);


function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setTarea({...tarea, [e.target.name]: e.target.value})
}

async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasYNumeros(nombre:string): boolean{

        const patron=/^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
        return patron.test(nombre);

    }



    if (!tarea.nombre.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    if (!tarea.descripcion.trim()) {
      setErrorMsg("El Procedimiento no puede estar vacía.");
      return;
    }

    if (tarea.nombre.trim().length < 4) {
    setErrorMsg("El nombre debe tener al menos 4 caracteres.");
    return;
    }

    if (tarea.descripcion.trim().length < 2) {
    setErrorMsg("El Procedimiento debe tener al menos 4 caracteres.");
    return;
    }

    if(!soloLetrasYNumeros(tarea.nombre)){
      setErrorMsg("No se permiten caracteres especiales en el nombre.");
      return;
    }


    const payload={
        nombre: tarea.nombre.trim(),
        descripcion:tarea.descripcion.trim(),
        plan_id:planID,
        frecuencia:tarea.frecuencia
    }

    setLoading(true);


    try {
        const res= await fetch(`${API_URL}/tareas/${tareaID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });


        if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al editar la tarea.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

    setSuccessMsg("Tarea dado de editado exitosamente");
    setTarea(TAREA_INICIAL);
    onSuccess?.();



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    }
   
}

useEffect(() => {
        if (tareaID) {
            const fetchPlanLimp = async () => {
                try {
                    const res = await fetch(`${API_URL}/tareas/${tareaID}`);
                    if (res.ok) {
                        const data = await res.json();
                        setTarea(data);
                    }
                } catch {
                    alert('La tarea no existe.');
                } finally {
                    setLoading(false);
                }
            };

            fetchPlanLimp();
        }
    }, [tareaID]);

function handleCancelar() {
    setTarea(TAREA_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}
return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Tarea</h1>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>


        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={tarea.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Procedimiento</label>
          <textarea
            id="descripcion"
            name="descripcion"
            placeholder="Introduce los pasos del procedimiento"
            value={tarea.descripcion}
            onChange={handleChange}
            rows={4}
          />
        </div>
        <div className="form-group">
                <label htmlFor="frecuencia">Frecuencia:</label>
                <select
                    id="frecuencia"
                    name="frecuencia"
                    value={tarea.frecuencia}
                    onChange={handleChange}
                >
                    <option value="" disabled>Seleccione la Frecuencia</option>
                    {FRECUENCIA.map((frecuencia) => (
                        <option key={frecuencia} value={frecuencia}>
                            {frecuencia}
                        </option>
                    ))}
                </select>
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