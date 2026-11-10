import { useEffect, useMemo, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';
import type { ProductoConId } from '../producto/tipos';

interface ConfiguracionProductosProps {
    identificadorUnico?: string | null;
    onSeleccionChange?: (productosVisibles: number[]) => void;
}

async function mensajeDeError(res: Response, porDefecto: string): Promise<string> {
    const errorData = await res.json().catch(() => ({}));
    if (typeof errorData.detail === "string") return errorData.detail;
    if (Array.isArray(errorData.detail)) {
        return errorData.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(", ");
    }
    return porDefecto;
}

const textoClaro = { color: 'var(--text-h)', fontSize: '13px', userSelect: 'none' as const };

export default function ConfiguracionProductosPublicos({ identificadorUnico, onSeleccionChange }: ConfiguracionProductosProps) {
    const { config } = useVistaPublica();
    const modoHabilitacion = !identificadorUnico;

    const [productos, setProductos] = useState<ProductoConId[]>([]);
    const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
    const [guardados, setGuardados] = useState<Set<number>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        async function cargarProductos() {
            try {
                const res = await apiFetch(`/productos/`);
                if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudieron cargar los productos."));
                const data: ProductoConId[] = await res.json();
                const activos = data.filter(p => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
                const visibles = new Set(activos.filter(p => p.visible_publico).map(p => p.id));
                setProductos(activos);
                setSeleccion(visibles);
                setGuardados(new Set(visibles));
            } catch (err: unknown) {
                setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
            } finally {
                setCargando(false);
            }
        }

        cargarProductos();
    }, [identificadorUnico]);

    useEffect(() => {
        onSeleccionChange?.([...seleccion]);
    }, [seleccion]);

    const hayCambios = useMemo(
        () => seleccion.size !== guardados.size || [...seleccion].some(id => !guardados.has(id)),
        [seleccion, guardados]
    );

    function toggleProducto(id: number) {
        setSuccessMsg(null);
        setSeleccion(prev => {
            const nueva = new Set(prev);
            if (nueva.has(id)) nueva.delete(id); else nueva.add(id);
            return nueva;
        });
    }

    function seleccionarTodos(todos: boolean) {
        setSuccessMsg(null);
        setSeleccion(todos ? new Set(productos.map(p => p.id)) : new Set());
    }

    async function handleGuardar() {
        setErrorMsg(null);
        setSuccessMsg(null);
        setGuardando(true);
        try {
            const res = await apiFetch(`/productos/visibilidad-publica`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productos_visibles: [...seleccion] }),
            });
            if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudieron guardar los cambios."));
            setGuardados(new Set(seleccion));
            setSuccessMsg("Cambios guardados. La vista pública ya muestra la nueva selección.");
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        } finally {
            setGuardando(false);
        }
    }

    const deshabilitado = !config.verProductos || guardando;

    return (
        <div className="form-group">
            {errorMsg && <div className="alerta-error" style={{ marginTop: '8px' }}>{errorMsg}</div>}
            {successMsg && <div className="alerta-exito" style={{ marginTop: '8px' }}>{successMsg}</div>}

            {cargando ? (
                <p style={textoClaro}>Cargando productos...</p>
            ) : productos.length === 0 ? (
                <p style={textoClaro}>No hay productos activos para mostrar.</p>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ ...textoClaro, opacity: 0.8 }}>
                            {seleccion.size} de {productos.length} seleccionados
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="btn-cancelar" style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => seleccionarTodos(true)} disabled={deshabilitado}>
                                Todos
                            </button>
                            <button type="button" className="btn-cancelar" style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => seleccionarTodos(false)} disabled={deshabilitado}>
                                Ninguno
                            </button>
                        </div>
                    </div>

                    <div className="tabla-wrapper" style={{ maxHeight: '275px', overflowY: 'auto', opacity: config.verProductos ? 1 : 0.55 }}>
                        <table className="tabla-custom">
                            <thead>
                                <tr>
                                    <th style={{ width: '1%' }}>Mostrar</th>
                                    <th>Producto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                aria-label={`Mostrar ${p.nombre}`}
                                                checked={seleccion.has(p.id)}
                                                onChange={() => toggleProducto(p.id)}
                                                disabled={deshabilitado}
                                                style={{ width: 'auto', margin: 0, cursor: deshabilitado ? 'not-allowed' : 'pointer' }}
                                            />
                                        </td>
                                        <td>
                                            <strong>{p.nombre}</strong>
                                            {p.descripcion && <div style={{ fontSize: '12px', opacity: 0.75 }}>{p.descripcion}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!modoHabilitacion && (
                        <button
                            type="button"
                            className="btn-guardar"
                            onClick={handleGuardar}
                            disabled={deshabilitado || !hayCambios}
                            style={{ alignSelf: 'flex-end', marginTop: '6px' }}
                        >
                            {guardando ? "Guardando..." : "Guardar cambios"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}