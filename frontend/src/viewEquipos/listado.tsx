import React, { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../styles/formularioAlta.css';

interface ListadoEquiposProps {
    onNuevoClick: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ListadoEquipos: React.FC<ListadoEquiposProps> = ({ onNuevoClick }) => {
    const [equipos, setEquipos] = useState<EquipoConId[]>([]);
    const [loading, setLoading] = useState(true);
    
    const fetchEquipos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/equipos/`); //chequea el backend
            if (res.ok) {
                const data = await res.json();
                setEquipos(data);
            } else {
                setEquipos([]);
            }
        } catch  {
            //dejamos la lista vacia sin el backend no responde

            setEquipos([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id?: number) => {
        if (!id) return;
        if (!window.confirm('¿Está seguro de que desea eliminar este equipo?')) return;

        try {
            const res = await fetch(`${API_URL}/equipos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setEquipos((prev) => prev.filter((equipo) => equipo.id !== id));
            }
        }catch{
            alert('No se pudo eliminar el equipo.');
        }
    };

    useEffect(() => {
        fetchEquipos();
    }, []);

    return (
        <div className="modulo-container">
            <div className="listado-top-bar">
              <div className="modulo-header">
                <h1>Listado de Equipos</h1>
                <div className="subtitulo">01 . Listado</div>
                </div>

            {onNuevoClick && (
                <button onClick={onNuevoClick} className="btn-guardar">
                    + Agregar Equipo
                </button>
            )}
         </div>

         <div className="tabla-wrapper">
            <table className="tabla-custom">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoria</th>
                        <th>Plan de Limpieza</th>
                        <th>Plan de Calibración</th>
                        <th className="acciones-col">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando equipos...
                            </td>
                        </tr>
                    ) : equipos.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                No hay equipos registrados.
                            </td>
                        </tr>
                    ) : (
                        equipos.map((i) => (
                            <tr key={i.id}>
                                <td>{i.nombre}</td>
                                <td>{i.categoria}</td>
                                <td>{i.plan_de_Limpieza}</td>
                                <td>{i.plan_de_calibracion}</td>
                                <td className="acciones-col">
                                   <div className="acciones-btns"> 
                                    <button className="btn-icon" title="Ver detalles">
                                        👁
                                    </button>
                                    <button className="btn-icon" title="Editar">
                                        ✎
                                    </button>
                                    <button className="btn-icon" title="Eliminar" onClick={() => handleEliminar(i.id)}>
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
    );

};