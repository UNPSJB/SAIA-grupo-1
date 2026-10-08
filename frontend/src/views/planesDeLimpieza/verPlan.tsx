import React, { useCallback, useEffect,useState } from 'react';
import type { PlanConId } from "./tipos";
import type { TareaConId } from '../tareas/tipos';
import '../../styles/formularioAlta.css';
import { VerTarea } from '../tareas/verTarea';
import { apiFetch } from '../../api/client';

interface DetallePlanLimpiezaProps {
    onCancel?: () => void;
    planlimpiezaID?: number | null;
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

export const VerPLanDeLimpieza: React.FC<DetallePlanLimpiezaProps> = ({ onCancel, planlimpiezaID }) => {
    const [planLimpieza, setPlanLimp] = useState<PlanConId | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVerTarea, setModelVer] = useState(false);
    const [tareaSeleccionada, setTareaSeleccionada]=useState <number | null>(null);
    

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
          <label htmlFor="fecha_inicio">Fecha de Inicio</label>
          <td>{formatDate(planLimpieza.fecha_inicio)}</td>
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

      </div>

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

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Procedimiento</th>
              <th>Frecuencia</th>
                            <th>Personal a Cargo</th>
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
            ) : planLimpieza.tareas?.length === 0 ? (
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
                  <td>{t.nombre_personal ?? 'Sin asignar'}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => {setModelVer(true); setTareaSeleccionada(t.id)}}
                      >
                        👁
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
                             El plan no existe.
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