import { useCallback, useEffect, useState } from "react";
import type { PlanConId } from "./tipos";
import type { EquipoConId } from '../equipos/tipos';
import "../../styles/formularioAlta.css";
import EditarTarea from "../tareas/editarTarea";
import { VerTarea } from "../tareas/verTarea";
import NuevaTarea from "../tareas/nuevaTarea";
import type { TareaConId } from "../tareas/tipos";
import { ConfirmAlertDialog } from "../../components/ui/alert-dialog";
import { apiFetch } from '../../api/client';

const PLAN_INICAL:PlanConId ={
    id:0,
    equipo_id:0,
    nombre:"",
} 
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

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
    const [modalAbierto,setModal]=useState(false);
    const [modalEditar,setModalEditar]=useState(false);
    const [modalVerTarea, setModelVer] = useState(false);
    const [tareaSeleccionada, setTareaSeleccionada]=useState <number | null>(null);
    const [tareaAConfirmar, setTareaAConfirmar] = useState<TareaConId | null>(null);
    const [dialogAbierto, setDialogAbierto] = useState(false);

    const fetchPlanLimp = useCallback(async () => {
            if (!planlimpiezaID) return;
            try {
                const res = await apiFetch(`/plan_De_limpieza/${planlimpiezaID}`);
                if (res.ok) {
                    const data = await res.json();
                    setPlanLimp(data);
                }
            } catch {
                alert('El Plan de limpieza no existe.');
            } finally {
                setLoading(false);
            }
        }, [planlimpiezaID]);

        useEffect(() => {
                fetchPlanLimp();
            }, [fetchPlanLimp]);


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
        const res= await apiFetch(`/plan_De_limpieza/${planlimpiezaID}`, {
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
        const fetchEquipos = async () => {
            try {
                const res = await apiFetch(`/equipos/`);
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

/*const handleEliminarTarea = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('¿Seguro que desea eliminar esta tarea?')) return;

    try {
      const res = await apiFetch(`/tareas/${id}`, { method: 'DELETE' });
      if (res.ok) {
         await fetchPlanLimp();
      } else {
        alert('No se pudo eliminar la tarea');
      }
    } catch {
      alert('Error de conexión al eliminar la tarea');
    }
  };*/

const abrirConfirmacion = (tarea: TareaConId) => {
        setTareaAConfirmar(tarea);
        setDialogAbierto(true);
    };

function handleCancelar() {
    setPlanLimp(PLAN_INICAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}

const ejecutarBajaTarea = async () => {
    if (!tareaAConfirmar) return;

    try {
        const res = await apiFetch(`/tareas/${tareaAConfirmar.id}`,
            {
                method: "DELETE",
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
                err.detail || "No se pudo eliminar la tarea."
            );
        }
        await fetchPlanLimp();

    } catch (err: unknown) {
        alert(
            err instanceof Error
                ? err.message
                : "Error de conexión al eliminar la tarea."
        );
    } finally {
        setDialogAbierto(false);
        setTareaAConfirmar(null);
    }
};
return (
    <div className="plan-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Plan De Limpieza</h1>
        <div className="subtitulo">02 · Modificacion</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}


      <div className="form-group">
          <label htmlFor="fecha_inicio">Fecha de Inicio</label>
          <td>{formatDate(planLimpieza.fecha_inicio)}</td>
        </div>

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Plan</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={planLimpieza.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="equipo_id">Equipo</label>
          <select id="equipo_id" name="equipo_id" value={planLimpieza.equipo_id} onChange={handleChange} >
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
                          <button type="button" className="btn-agregar" onClick={()=>setModal(true)}>
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
                            <th>Responsable</th>
                            <th className="acciones-col">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando Tareas...
                              </td>
                            </tr>
                          ) :planLimpieza.tareas?.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                No hay Tareas registradas.
                              </td>
                            </tr>
                          ) : (
                            planLimpieza.tareas?.map((t: TareaConId) => (
                               <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                  <td>{t.descripcion}</td>
                  <td>{t.frecuencia}</td>
                  <td>{t.nombre_responsable ?? 'Sin asignar'}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => {setModelVer(true); setTareaSeleccionada(t.id)}}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => {setModalEditar(true); setTareaSeleccionada(t.id)}}
                      >
                        ✎
                      </button>
                      <button
                          type="button"
                          className="btn-icon btn-eliminar"
                          title="Dar de baja"
                          onClick={() => abrirConfirmacion(t)} 
                          >
                         🗑
                    </button>
                    </div>

                  </td>
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

      <ConfirmAlertDialog
                open={dialogAbierto}
                title="¿Dar de baja tarea?"
                description={`¿Estás seguro de que deseas eliminar la tarea "${tareaAConfirmar?.nombre}"? Esta acción no se puede deshacer.`}
                confirmText="Confirmar Baja"
                cancelText="Cancelar"
                isDestructive={true}
                onConfirm={ejecutarBajaTarea}
                 onCancel={() => {
                       setDialogAbierto(false);
                       setTareaAConfirmar(null);
                      }}
                />

      {modalAbierto &&(
      
                    <div className="modal-abierto">
                      <div className="modal-content">
                        <NuevaTarea
                        planID={planLimpieza?.id}
                        onSuccess={()=> {setModal(false); fetchPlanLimp()}}
                        onCancel={() => setModal(false)}
                        />
      
                      </div>
            </div>)}
      
            {modalEditar &&(
              <div className="modal-abierto">\
              <div className="modal-content">
                <EditarTarea
                tareaID={tareaSeleccionada}
                planID={planLimpieza.id}
                onSuccess={() =>{setModalEditar(false); fetchPlanLimp()}}
                onCancel={() => setModalEditar(false)}
                />
                </div>
                </div>)}
      
                {modalVerTarea && (
                  <div className="modal-abierto">
                    <div className="modal-content">
                      <VerTarea
                      tareaID={tareaSeleccionada}
                      onCancel={() => setModelVer(false)}
                      />
                      </div>
                      </div>
                )}

                
    </div>
  );
}