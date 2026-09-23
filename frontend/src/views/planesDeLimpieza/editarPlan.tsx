import { useEffect, useState } from "react";
import type { PlanConId } from "./tipos";
import type { EquipoConId } from '../../viewEquipos/tipos';
import "../../styles/formularioAlta.css";

const PLAN_INICAL:PlanConId ={
    id:0,
    equipo_id:0,
    nombre:""
} 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface EditarPlanDeLimpizaProps {
    planlimpiezaID:number | null;
    onSuccess?: () => void;
    onCancel?: () => void;

}


export default function EditarPlanDeLimpieza({planlimpiezaID,onSuccess, onCancel}: EditarPlanDeLimpizaProps){
    const [planLimpieza, setPlanLimp] = useState<PlanConId>(PLAN_INICAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [equipos,setEquipos]= useState<EquipoConId[]>([]);


function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setPlanLimp({...planLimpieza, [e.target.name]: e.target.value})
}

async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasYNumeros(nombre:string): boolean{

        const patron=/^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
        return patron.test(nombre);

    }



    if (!planLimpieza.nombre.trim()) {
      setErrorMsg("El nombre del plan no puede estar vacío.");
      return;
    }

    if (planLimpieza.nombre.trim().length < 4) {
    setErrorMsg("El nombre debe tener al menos 4 caracteres.");
    return;
    }

    if(!soloLetrasYNumeros(planLimpieza.nombre)){
      setErrorMsg("No se permiten caracteres especiales en el nombre.");
      return;
    }

    const payload={
        nombre: planLimpieza.nombre.trim(),
        equipo_id:Number(planLimpieza.equipo_id),
    }

    setLoading(true);


    try {
        const res= await fetch(`${API_URL}/plan_De_limpieza/${planlimpiezaID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });


        if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar el plan.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

    setSuccessMsg("Plan de Limpieza fue Editado exitosamente");
    setPlanLimp(PLAN_INICAL);
    onSuccess?.();



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    }
   
}

useEffect(() => {
        if (planlimpiezaID) {
            const fetchPlanLimp = async () => {
                try {
                    const res = await fetch(`${API_URL}/plan_De_limpieza/${planlimpiezaID}`);
                    if (res.ok) {
                        const data = await res.json();
                        setPlanLimp(data);
                    }
                } catch {
                    alert('El plan de limpieza no existe.');
                } finally {
                    setLoading(false);
                }
            };

            fetchPlanLimp();
        }
    }, [planlimpiezaID]);

useEffect(() => {
        const fetchEquipos = async () => {
            try {
                const res = await fetch(`${API_URL}/equipos/`);
                if (res.ok) {
                    const data = await res.json();
                    setEquipos(data);
                }
            } catch {
                setEquipos([]);
            }
        };
        fetchEquipos();
    }, []);


function handleCancelar() {
    setPlanLimp(PLAN_INICAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}
return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Plan De Limpieza</h1>
        <div className="subtitulo">02 · Modificacion</div>
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
            value={planLimpieza.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="equipo_id">Equipo ID</label>
          <select id="equipo_id" name="equipo_id" value={planLimpieza.equipo_id} onChange={handleChange} >
            <option value="" disabled>Seleccione un equipo</option>
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
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