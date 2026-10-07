import { useState } from "react";
import type { TareaConId, TareaForm } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from '../../api/client';
import { useResponsables } from "./useResponsables";

const TAREA_INICAL:TareaForm ={
    nombre:"",
    descripcion:"",
    plan_id:"",
    frecuencia:"",
    responsable_legajo:""
} 

const FRECUENCIA = ["diaria","semanal","mensual"]
interface NuevaTareaProps {
    planID?:number | null;
    onSuccess?: () => void;
    onCancel?: () => void;
    onAgregarLocal?: (Tarea:TareaConId)=> void;

}


export default function NuevaTarea({onAgregarLocal,planID,onSuccess, onCancel}: NuevaTareaProps){
    const [tarea, setTarea] = useState<TareaForm>(TAREA_INICAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const responsables = useResponsables();


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

    if (!tarea.responsable_legajo) {
      setErrorMsg("Debe asignar un responsable a la tarea.");
      return;
    }

    if (!planID) {
          const responsable = responsables.find((p) => p.legajo === Number(tarea.responsable_legajo));
          onAgregarLocal?.({
            ...tarea,
            responsable_legajo: Number(tarea.responsable_legajo),
            nombre_responsable: responsable ? `${responsable.nombre} ${responsable.apellido}` : null,
          } as TareaConId);
          onSuccess?.();
          return;
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
        frecuencia:tarea.frecuencia,
        responsable_legajo:Number(tarea.responsable_legajo)
    }

    setLoading(true);


    try {
        const res= await apiFetch(`/tareas/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });


        if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar la tarea.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

    setSuccessMsg("Tarea dado de alta exitosamente");
    setTarea(TAREA_INICAL);
    onSuccess?.();



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    }
   
}




function handleCancelar() {
    setTarea(TAREA_INICAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}
return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nueva Tarea</h1>
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
            required
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
            required
          />
        </div>
        <div className="form-group">
                <label htmlFor="frecuencia">Frecuencia:</label>
                <select
                    id="frecuencia"
                    name="frecuencia"
                    value={tarea.frecuencia}
                    onChange={handleChange}
                    required
                >
                    <option value="" disabled>Seleccione la Frecuencia</option>
                    {FRECUENCIA.map((frecuencia) => (
                        <option key={frecuencia} value={frecuencia}>
                            {frecuencia}
                        </option>
                    ))}
                </select>
            </div>

        <div className="form-group">
          <label htmlFor="responsable_legajo">Responsable</label>
          <select
            id="responsable_legajo"
            name="responsable_legajo"
            value={tarea.responsable_legajo}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione un usuario activo</option>
            {responsables.map((p) => (
              <option key={p.legajo} value={p.legajo}>
                {p.apellido}, {p.nombre} (Legajo: {p.legajo})
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