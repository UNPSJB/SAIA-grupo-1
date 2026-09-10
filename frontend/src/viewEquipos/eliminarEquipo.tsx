import { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../styles/formularioAlta.css';

interface EliminarEquipoProps{
    equipoID?:number | null;
    onCancel?: () => void;
    onSucces?: ()=> void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function EliminarEquipo({equipoID,onCancel,onSucces}:EliminarEquipoProps){

    const[equipo,setEquipo]= useState<EquipoConId | null>(null);
    const[loading, setLoading]= useState(true);

const handleEliminar = async (id?: number) => {
        if (!id) return;
        if (!window.confirm('¿Está seguro de que desea eliminar este equipo?')) return;

        try {
            const res = await fetch(`${API_URL}/equipos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setEquipo(null);
                if(onSucces) {
                    onSucces()
                }else if(onCancel){
                    onCancel();
                };

            }
        }catch{
            alert('No se pudo eliminar el equipo.');
        }
    };
    useEffect(()=>{

     if(equipoID){
        const fetchEquipo= async() => {

            try {
                const res=  await fetch(`${API_URL}/equipos/${equipoID}`);
                if(res.ok){
                  const data=  await res.json(); 
                  setEquipo(data);
                }
            } catch{
                alert("El equipo no existe.")
            }finally{
                setLoading(false);
            }
        };

        fetchEquipo();
    }

    }, [equipoID]);


    return (
    <div className="modulo-container formulario-box">
        <div className="modulo-header">
            <h1>Eliminar Equipo</h1>
            <div className="subtitulo">Equipo: {equipoID}</div>
        </div>

            {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando equipo...
                            </td>
                        </tr>
        ) : equipo ? (
        <form >
            <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={equipo.nombre}
                    disabled 
                />
            </div>
            <div className="form-group">
                <label htmlFor="categoria">Categoría:</label>
                <input
                    id="categoria"
                    name="categoria"
                    value={equipo.categoria}
                    disabled
                >
                </input>
            </div>

            <div className="form-group">
                <label htmlFor="ubicacion">Ubicación</label>
                <input
                    id="ubicacion"
                    name="ubicacion"
                    type="text"
                    value={equipo.ubicacion}
                    disabled
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_Limpieza">Plan de Limpieza</label>
                <input
                    id="plan_de_Limpieza"
                    name="plan_de_Limpieza"
                    type="text"
                    value={equipo.plan_de_Limpieza}
                    disabled
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
                <input
                    id="plan_de_calibracion"
                    name="plan_de_calibracion"
                    type="text"
                    value={equipo.plan_de_calibracion} 
                    disabled
                />
            </div>
        </form>
        ) : (
                     <div style={{ textAlign: 'center', padding: '2rem' }}>
                             El equipo no existe.
                        </div>
                
                
                )}

                <div className="form-acciones"> <button className="btn-eliminar" title="Eliminar" onClick={() => handleEliminar(equipoID ?? undefined)}>
                                        Eliminar
                        </button>
                        
                        <button type="button"  className="btn-cancelar" onClick={onCancel}>
                    Cancelar
                </button>
                </div>

        
    </div>
    
        
)

};


