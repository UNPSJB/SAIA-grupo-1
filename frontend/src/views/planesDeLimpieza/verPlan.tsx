import React, { useEffect,useState } from 'react';
import type { PlanConId } from "./tipos";
import type {TareaConId } from '../tareas/tipos';
import '../../styles/formularioAlta.css';

interface DetallePlanLimpiezaProps {
    onCancel?: () => void;
    planlimpiezaID?: number | null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const VerPLanDeLimpieza: React.FC<DetallePlanLimpiezaProps> = ({ onCancel, planlimpiezaID }) => {
    const [planLimpieza, setPlanLimp] = useState<PlanConId | null>(null);
    const [loading, setLoading] = useState(true);

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
                    alert('El Plan de limpieza no existe.');
                } finally {
                    setLoading(false);
                }
            };

            fetchPlanLimp();
        }
    }, [planlimpiezaID]);

    return (
    <div className="plan-container formulario-box">
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
        <form >
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
            <button type="button" className="btn-agregar">
                +Agregar Tarea
            </button>
            </div>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripcion</th>
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

        </form>
        ) : (
                <tr>
                     <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                             El equipo no existe.
                        </td>
                </tr>
                )}



                <div className="form-acciones">
                <button type="button"  className="btn-cancelar" onClick={onCancel}>
                    Volver
                </button>
            </div>
        
    </div>
    
        
)

};