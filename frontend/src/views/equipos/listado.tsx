import React, { useEffect, useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';

interface ListadoEquiposProps {
    onNuevoClick?: () => void;
    onDetalleClick?: (id: number) => void;
    onEditarClick?: (id: number) => void;
    onEliminarClick?: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ListadoEquipos: React.FC<ListadoEquiposProps> = ({
    onNuevoClick,
    onDetalleClick,
    onEditarClick,
    onEliminarClick,
}) => {
    const [equipos, setEquipos] = useState<EquipoConId[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroCategoria, setFiltroCategoria] = useState('TODOS');

    const [equipoAEliminar, setEquipoAEliminar] = useState<EquipoConId | null>(null);
    const [dialogAbierto, setDialogAbierto] = useState(false);

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

    const abrirConfirmacion = (eq: EquipoConId) => {
        if (onEliminarClick) {
            onEliminarClick(eq.id);
            return;
        }
        setEquipoAEliminar(eq);
        setDialogAbierto(true);
    };

    const ejecutarEliminar = async () => {
        if (!equipoAEliminar) return;
        try {
            const res = await fetch(`${API_URL}/equipos/${equipoAEliminar.id}`, { method: 'DELETE' });
            if (res.ok) {
                setEquipos((prev) => prev.filter((e) => e.id !== equipoAEliminar.id));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'No se pudo eliminar el equipo');
            }
        } catch {
            alert('Error de conexión al eliminar el equipo');
        } finally {
            setDialogAbierto(false);
            setEquipoAEliminar(null);
        }
    };

    const categoriasUnicas = Array.from(new Set(equipos.map((e) => e.categoria).filter(Boolean)));

    const equiposFiltrados = equipos.filter((eq) => {
        const term = busqueda.toLowerCase().trim();
        const matchBusqueda = !term ||
            eq.nombre.toLowerCase().includes(term) ||
            (eq.ubicacion && eq.ubicacion.toLowerCase().includes(term)) ||
            (eq.categoria && eq.categoria.toLowerCase().includes(term)) ||
            (eq.plan_de_Limpieza?.nombre && eq.plan_de_Limpieza.nombre.toLowerCase().includes(term));

        const matchEstado = filtroEstado === 'TODOS' || eq.estado.toLowerCase() === filtroEstado.toLowerCase();
        const matchCat = filtroCategoria === 'TODOS' || eq.categoria.toLowerCase() === filtroCategoria.toLowerCase();

        return matchBusqueda && matchEstado && matchCat;
    });

    return (
        <div className="modulo-container">
            <div className="listado-top-bar">
                <div className="modulo-header">
                    <h1>Listado de Equipos</h1>
                    <div className="subtitulo">01 · Listado</div>
                </div>

                {onNuevoClick && (
                    <button onClick={onNuevoClick} className="btn-guardar">
                        + Agregar Equipo
                    </button>
                )}
            </div>

            <div className="filtros-top-bar">
                <input
                    type="text"
                    placeholder="Buscar equipo por nombre, ubicación o categoría..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="input-busqueda"
                />

                <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="select-filtro"
                >
                    <option value="TODOS">Todas las categorías</option>
                    {categoriasUnicas.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="select-filtro"
                >
                    <option value="TODOS">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                </select>
            </div>

            <div className="tabla-wrapper">
                <table className="tabla-custom">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Categoría</th>
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
                                    {busqueda || filtroEstado !== 'TODOS' || filtroCategoria !== 'TODOS'
                                        ? 'No se encontraron equipos que coincidan con los filtros.'
                                        : 'No hay equipos registrados.'}
                                </td>
                            </tr>
                        ) : (
                            equiposFiltrados.map((i) => (
                                <tr key={i.id}>
                                    <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                                    <td>{i.categoria}</td>
                                    <td>{i.plan_de_Limpieza?.nombre || 'Sin plan asignado'}</td>
                                    <td>
                                        <span className={`badge-status ${i.estado.toLowerCase() === 'activo' ? 'activo' : 'inactivo'}`}>
                                            {i.estado.charAt(0).toUpperCase() + i.estado.slice(1).toLowerCase()}
                                        </span>
                                    </td>
                                    <td className="acciones-col">
                                        <div className="acciones-btns">
                                            <button
                                                className="btn-icon btn-ver"
                                                title="Ver detalles"
                                                onClick={() => onDetalleClick?.(i.id)}
                                            >
                                                👁
                                            </button>
                                            <button
                                                className="btn-icon btn-editar"
                                                title="Editar"
                                                onClick={() => onEditarClick?.(i.id)}
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="btn-icon btn-eliminar"
                                                title="Eliminar"
                                                onClick={() => abrirConfirmacion(i)}
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

            <ConfirmAlertDialog
                open={dialogAbierto}
                title="¿Eliminar equipo?"
                description={`¿Seguro que deseas eliminar el equipo "${equipoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
                onConfirm={ejecutarEliminar}
                onCancel={() => {
                    setDialogAbierto(false);
                    setEquipoAEliminar(null);
                }}
            />
        </div>
    );
};