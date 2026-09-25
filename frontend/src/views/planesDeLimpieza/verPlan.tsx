import React, { useCallback, useEffect,useState } from 'react';
import type { PlanConId } from "./tipos";
import type {TareaConId } from '../tareas/tipos';
import '../../styles/formularioAlta.css';
import NuevaTarea from '../tareas/nuevaTarea';
import EditarTarea from '../tareas/editarTarea';

interface DetallePlanLimpiezaProps {
    onCancel?: () => void;
    planlimpiezaID?: number | null;
}

type nuevoModal= 'crear'| 'editar';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export const VerPLanDeLimpieza: React.FC<DetallePlanLimpiezaProps> = ({ onCancel, planlimpiezaID }) => {
    const [planLimpieza, setPlanLimp] = useState<PlanConId | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalAbierto,setModal]=useState(false);
    const [tareaSeleccionada,setTareaSeleccionada]=useState<number | null>(null);
    

    const fetchPlanLimp = useCallback(async () => {
        if (!planlimpiezaID) return;
        try {
            const res = await fetch(`${API_URL}/plan_De_limpieza/${planlimpiezaID}`);
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

    return (
    <div className="plan-container invertir-css">
        <div className="modulo-header">
            <h1>Plan de limpieza</h1>
        </div>

            {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando plan de limpieza...
                            </td>
                        </tr>
        ) : planLimpieza ? (
        <div >

          <div className="form-group">
          <label htmlFor="fecha_creacion">Fecha de Creacion</label>
          <td>{formatDate(planLimpieza.fecha_creacion)}</td>
        </div>
            <div className="form-group">
                <label htmlFor="nombre">PLAN</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={planLimpieza.nombre}
                    disabled 
                />
            </div>
            <div className="form-group">
                <label htmlFor="equipo">EQUIPO</label>
                <input
                    id="equipo"
                    name="equipo"
                    value={planLimpieza.nombre_equipo}
                    disabled
                >
                </input>
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

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Procedimiento</th>
              <th>Frecuencia</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Tareas...
                </td>
              </tr>
            ) : planLimpieza.tareas?.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay Tareas registradas.
                </td>
              </tr>
            ) : (
              planLimpieza.tareas?.map((t: TareaConId) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                  <td>{t.descripcion}</td>
                  <td>{t.frecuencia}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-eliminar"
                        title="Eliminar"
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

        </div>
        ) : (
                <tr>
                     <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                             El equipo no existe.
                        </td>
                </tr>
                )
                
                
                }



                <div className="form-acciones">
                <button type="button"  className="btn-cancelar" onClick={onCancel}>
                    Volver
                </button>
            </div>
        
    </div>
    
        
)

};