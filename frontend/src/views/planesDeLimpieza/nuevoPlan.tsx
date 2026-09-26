import { useEffect, useState } from "react";
import type { PlanForm } from "./tipos";
import type { EquipoConId } from '../../viewEquipos/tipos';
import "../../styles/formularioAlta.css";
import type { TareaConId } from "../tareas/tipos";
import NuevaTarea from "../tareas/nuevaTarea";

const PLAN_INICAL:PlanForm ={
    nombre:"",
    equipo_id:"",
    fecha_creacion:"",
    tareas:[]
} 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const HOY = new Date().toISOString().split("T")[0];

interface NuevoPlanDeLimpizaProps {
    onSuccess?: () => void;
    onCancel?: () => void;

}


export default function NuevoPlanDeLimpieza({onSuccess, onCancel}: NuevoPlanDeLimpizaProps){
    const [planLimpieza, setPlanLimp] = useState<PlanForm>(PLAN_INICAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [equipos,setEquipos]= useState<EquipoConId[]>([]);
    const [tareas,setTareas]= useState<TareaConId[]> ([]);
    const [modalAbierto,setModalAbierto]= useState(false);


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

    if(planLimpieza.fecha_creacion > HOY){

      setErrorMsg("La fecha no puede ser mayor a la fecha actual");
    }

    const payload={
        nombre: planLimpieza.nombre.trim(),
        equipo_id:Number(planLimpieza.equipo_id),
        fecha_creacion:planLimpieza.fecha_creacion,
        tareas: tareas
    }

    setLoading(true);


    try {
        const res= await fetch(`${API_URL}/plan_De_limpieza/`, {
            method: "POST",
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

    setSuccessMsg("Plan de Limpieza dado de alta exitosamente");
    setPlanLimp(PLAN_INICAL);
    setTareas([]);
    onSuccess?.();



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    }
   
}

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
    setTareas([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}
return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Plan De Limpieza</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>

        <div className="form-group">
          <label htmlFor="fecha_creacion">Fecha del Plan</label>
          <input
            id="fecha_creacion"
            name="fecha_creacion"
            type="date"
            max={HOY}
            value={planLimpieza.fecha_creacion}
            onChange={handleChange}
            required
          />
        </div>


        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={planLimpieza.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="equipo_id">Equipo ID</label>
          <select id="equipo_id" name="equipo_id" value={planLimpieza.equipo_id} onChange={handleChange} required>
            <option value="" disabled>Seleccione un equipo</option>
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="listado-top-bar">
                   <div className="modulo-header">
                   <h2>Tareas</h2>
              </div>
      
              <div className="accion-agregar">
                  <button type="button" className="btn-agregar" onClick={()=>setModalAbierto(true)}>
                      +Agregar Tarea
                  </button>
                  </div>
            </div>
      
            <div className="tabla-wrapper">
              <table className="tabla-custom">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Procedimiento</th>
                    <th>Frecuencia</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                        Cargando Tareas...
                      </td>
                    </tr>
                  ) :tareas?.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay Tareas registradas.
                      </td>
                    </tr>
                  ) : (
                    tareas?.map((t: TareaConId) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                        <td>{t.descripcion}</td>
                        <td>{t.frecuencia}</td>
                      </tr>
      
                      
                    ))
                  )}
                </tbody>
              </table>
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

      
            {modalAbierto &&(
      
                    <div className="modal-abierto">
                      <div className="modal-content">
                        <NuevaTarea
                        onSuccess={()=> setModalAbierto(false)}
                        onCancel={() => setModalAbierto(false)}
                        onAgregarLocal={(nuevaTarea) => {setTareas(prev =>[...prev,nuevaTarea])}}
                        />
      
                      </div>
            </div>)}
      
    </div>
  );
}