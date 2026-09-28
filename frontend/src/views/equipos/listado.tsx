import React, { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../../styles/formularioAlta.css';

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
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');

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

    const equiposFiltrados = equipos.filter((i) => {
        const term = busqueda.toLowerCase();
        const coincideBusqueda =
            (i.nombre?.toLowerCase().includes(term) ?? false) ||
            (i.ubicacion?.toLowerCase().includes(term) ?? false);
        const coincideCategoria = filtroCategoria === 'TODOS' || i.categoria?.toUpperCase() === filtroCategoria;
        const coincideEstado = filtroEstado === 'TODOS' || i.estado?.toUpperCase() === filtroEstado;
        return coincideBusqueda && coincideCategoria && coincideEstado;
    });

    const campoFiltroStyle: React.CSSProperties = {
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        backgroundColor: 'var(--code-bg)',
        fontSize: '14px',
        color: 'var(--text-h)',
        outline: 'none',
    };

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

         <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
                type="text"
                placeholder="Buscar por nombre o ubicación..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ ...campoFiltroStyle, flex: 1, minWidth: '220px' }}
            />

            <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={{ ...campoFiltroStyle, cursor: 'pointer' }}
            >
                <option value="TODOS">Todas las categorías</option>
                <option value="CONSERVAMIENTO">Conservamiento</option>
                <option value="SANAMIENTO">Sanamiento</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="DESINFECCION">Desinfección</option>
            </select>

            <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{ ...campoFiltroStyle, cursor: 'pointer' }}
            >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
            </select>
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
                    ) : equiposFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                No se encontraron equipos.
                            </td>
                        </tr>
                    ) : (
                        equiposFiltrados.map((i) => (
                            <tr key={i.id}>
                                <td>{i.nombre}</td>
                                <td>{i.categoria}</td>
                                <td>{i.plan_de_Limpieza?.nombre}</td>
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