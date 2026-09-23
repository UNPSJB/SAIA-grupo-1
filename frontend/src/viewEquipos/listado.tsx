import React, { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../styles/formularioAlta.css';

interface ListadoEquiposProps {
    onNuevoClick: () => void;
    onDetalleClick: (id: number) => void;
    onEditarClick: (id:number) => void;
    onEliminarClick: (id:number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ListadoEquipos: React.FC<ListadoEquiposProps> = ({ onNuevoClick, onDetalleClick, onEditarClick ,onEliminarClick}) => {
    const [equipos, setEquipos] = useState<EquipoConId[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        let cancelado = false;
        const fetchEquipos = async () => {
            try {
                const res = await fetch(`${API_URL}/equipos/`);
                if (!cancelado) {
                    if (res.ok) {
                        const data = await res.json();
                        setEquipos(data);
                    } else {
                        setEquipos([]);
                    }
                }
            } catch {
                if (!cancelado) {
                    setEquipos([]);
                }
            } finally {
                if (!cancelado) {
                    setLoading(false);
                }
            }
        };

        fetchEquipos();
        return () => {
            cancelado = true;
        };
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
                        <th>Estado</th>
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
                                <td>{i.estado}</td>
                                <td className="acciones-col">
                                   <div className="acciones-btns"> 
                                    <button className="btn-icon" title="Ver detalles" onClick={() => onDetalleClick(i.id)}>
                                        👁
                                    </button>
                                    <button className="btn-icon" title="Editar" onClick={() => onEditarClick(i.id)}>
                                        ✎
                                    </button>
                                    <button className="btn-icon" title="Eliminar" onClick={() => onEliminarClick(i.id)}>
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