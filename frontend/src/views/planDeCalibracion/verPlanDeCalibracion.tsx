import React, {useEffect,useState } from 'react';
import type { PlanDeCalibracionConId } from "./tipos";
import '../../styles/formularioAlta.css';
import RegistrarCalibracion from '../calibracion_Realizada/registrarCalibracion';
import { ListadoCalibracionesRealizadas } from '../calibracion_Realizada/listado';
import { VerCalibracion } from '../calibracion_Realizada/verCalibracionEcha';

interface DetallePlanCalibracionProps {
    onCancel?: () => void;
    planCalibracionID?: number | null;
}


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

export const VerPlanDeCalibracion: React.FC<DetallePlanCalibracionProps> = ({ onCancel, planCalibracionID }) => {
    const [planCalibracion, setPlanCalibracion] = useState<PlanDeCalibracionConId | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalAbierto, setModalAbierto]= useState(false);
    const [modalVerCalibraciones, setModalVerTodas]= useState(false);
    const [modalVerCalibracion,setModalVer]= useState(false);
    const [calibracionSeleccionada, setCalibracionSeleccionada]=useState <number | null>(null);
    

    useEffect(() => {
            if (planCalibracionID) {
                const fetchPlanCalibracion = async () => {
                    try {
                        const res = await fetch(`${API_URL}/plan_de_calibracion/${planCalibracionID}/`);
                        if (res.ok) {
                            const data = await res.json();
                            setPlanCalibracion(data);
                        }
                    } catch {
                        alert('El plan de calibración no existe.');
                    } finally {
                        setLoading(false);
                    }
                };
    
                fetchPlanCalibracion();
            }
        }, [planCalibracionID]);

    return (
    <div className="plan-container invertir-css">
        <div className="modulo-header">
            <h1>Plan de calibración</h1>
        </div>
        <div className="acciones-botones-container">
            <div className="accion-agregar">
                  <button type="button" className="btn-agregar" onClick={()=>setModalAbierto(true)}>
                      +Marcar como realizada
                  </button>
            </div>

            <div className="accion-agregar">

                <button type="button" className="btn-verCAL" disabled={!planCalibracion?.calibraciones_realizadas || planCalibracion.calibraciones_realizadas.length === 0} onClick={()=> {const cantidad= planCalibracion?.calibraciones_realizadas?.length || 0 
                if(cantidad ===1){
                    const c=planCalibracion?.calibraciones_realizadas?.[0];
                    setModalVer(true);
                    setCalibracionSeleccionada(c?.id ?? null);
                }else if(cantidad>1){
                    setModalVerTodas(true)
                }}}> Ver Realizaciones</button>
            </div>
          </div>


            {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando plan de calibración...
                            </td>
                        </tr>
        ) : planCalibracion ? (
        <div >

          <div className="form-group">
          <label htmlFor="fecha_mantenimiento">Fecha de Mantenimiento</label>
          <td>{formatDate(planCalibracion.fecha_mantenimiento)}</td>
        </div>

        <div className="form-group">
            <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
            <td>{formatDate(planCalibracion.fecha_vencimiento)}</td>
        </div>
        
            <div className="form-group">
                <label htmlFor="nombre">PLAN</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={planCalibracion.nombre}
                    disabled 
                />
            </div>
            <div className="form-group">
                <label htmlFor="equipo">EQUIPO</label>
                <input
                    id="equipo"
                    name="equipo"
                    value={planCalibracion.nombre_equipo}
                    disabled
                >
                </input>
            </div>


          <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            className="descripcion"
            id="descripcion"
            name="descripcion"
            value={planCalibracion.descripcion}
            style={{
               height: "auto",
                overflow: "hidden",
             }}
            ref={(el) => {
                    if (el) {
                       el.style.height = "auto";
                       el.style.height = `${el.scrollHeight}px`;
                       }
                     }}
            disabled
          />
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


            {modalAbierto &&(
                  
                                <div className="modal-abierto">
                                  <div className="modal-content">
                                    <RegistrarCalibracion
                                    planID={planCalibracion?.id}
                                    onSuccess={()=> setModalAbierto(false)}
                                    onCancel={() => setModalAbierto(false)}
                                    />
                  
                                  </div>
                        </div>)}

            {modalVerCalibraciones&& (
                                 <div className="modal-abierto">
                                  <div className="modal-content">
                                    <ListadoCalibracionesRealizadas
                                    planID={planCalibracion?.id}
                                    onCancel={() => setModalVerTodas(false)}
                                    />
                  
                                  </div>
                        </div>
            )}


            {modalVerCalibracion && (
                                <div className="modal-abierto">
                                  <div className="modal-content">
                                    <VerCalibracion
                                    calibracionID={calibracionSeleccionada}
                                    onCancel={() => setModalVer(false)}
                                    />
                  
                                  </div>
                        </div>)}
        
    </div>
    
        
)

};