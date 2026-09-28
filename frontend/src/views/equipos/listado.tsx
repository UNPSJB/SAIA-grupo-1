import React, { useEffect, useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';

interface ListadoEquiposProps {
    onNuevoClick?: () => void;
    onDetalleClick?: (id: number) => void;
    onEditarClick?: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ListadoEquipos: React.FC<ListadoEquiposProps> = ({
    onNuevoClick,
    onDetalleClick,
    onEditarClick,
}) => {
    const [equipos, setEquipos] = useState<EquipoConId[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroCategoria, setFiltroCategoria] = useState('TODOS');

    const [equipoAConfirmar, setEquipoAConfirmar] = useState<EquipoConId | null>(null);
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
        setEquipoAConfirmar(eq);
        setDialogAbierto(true);
    };

    const ejecutarToggle = async () => {
        if (!equipoAConfirmar) return;
        const esActivo = equipoAConfirmar.estado.toLowerCase() === 'activo';
        const accion = esActivo ? 'dar de baja' : 'reactivar';
        try {
            const url = esActivo
                ? `${API_URL}/equipos/${equipoAConfirmar.id}`
                : `${API_URL}/equipos/${equipoAConfirmar.id}/reactivar`;
            const method = esActivo ? 'DELETE' : 'PATCH';
            const res = await fetch(url, { method });
            if (res.ok) {
                const nuevoEstado = esActivo ? 'inactivo' : 'activo';
                setEquipos((prev) =>
                    prev.map((e) => (e.id === equipoAConfirmar.id ? { ...e, estado: nuevoEstado } : e))
                );
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || `No se pudo ${accion} el equipo.`);
            }
        } catch {
            alert(`Error de conexión al ${accion} el equipo.`);
        } finally {
            setDialogAbierto(false);
            setEquipoAConfirmar(null);
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
                                                className={`btn-icon ${i.estado.toLowerCase() === 'activo' ? 'btn-eliminar' : 'btn-reactivar'}`}
                                                title={i.estado.toLowerCase() === 'activo' ? 'Dar de baja' : 'Reactivar'}
                                                onClick={() => abrirConfirmacion(i)}
                                            >
                                                {i.estado.toLowerCase() === 'activo' ? '🗑' : '🔄'}
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
                title={equipoAConfirmar?.estado.toLowerCase() === 'activo' ? '¿Dar de baja equipo?' : '¿Reactivar equipo?'}
                description={
                    equipoAConfirmar?.estado.toLowerCase() === 'activo'
                        ? `¿Estás seguro de que deseas desactivar el equipo "${equipoAConfirmar?.nombre}"?`
                        : `¿Estás seguro de que deseas reactivar el equipo "${equipoAConfirmar?.nombre}"?`
                }
                confirmText={equipoAConfirmar?.estado.toLowerCase() === 'activo' ? 'Confirmar Baja' : 'Confirmar Reactivación'}
                cancelText="Cancelar"
                isDestructive={equipoAConfirmar?.estado.toLowerCase() === 'activo'}
                onConfirm={ejecutarToggle}
                onCancel={() => {
                    setDialogAbierto(false);
                    setEquipoAConfirmar(null);
                }}
            />
        </div>
    );
};