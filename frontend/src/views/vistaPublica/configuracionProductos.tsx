import { useEffect, useMemo, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';
import type { ProductoConId } from '../producto/tipos';

interface ConfiguracionProductosProps {
    identificadorUnico?: string | null;
    // al habilitar la vista todavia no hay QR: la seleccion se le pasa a la pantalla de habilitacion,
    // que la guarda junto con el boton "Habilitar" (no se muestra el boton de guardar propio)
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

// Sección del panel de la vista pública: interruptor general del listado + qué productos se muestran
export default function ConfiguracionProductosPublicos({ identificadorUnico, onSeleccionChange }: ConfiguracionProductosProps) {
    const { config, actualizarConfig } = useVistaPublica();
    const modoHabilitacion = !identificadorUnico;

    const [productos, setProductos] = useState<ProductoConId[]>([]);
    const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
    const [guardados, setGuardados] = useState<Set<number>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        // el estado real del interruptor es el guardado en el QR
        async function sincronizarInterruptor() {
            if (!identificadorUnico) return;
            try {
                const res = await apiFetch(`/identificadorQR/verificar/${identificadorUnico}`);
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data.verProductos === 'boolean') actualizarConfig('verProductos', data.verProductos);
                }
            } catch (err) {
                console.error("Error al sincronizar el listado de productos:", err);
            }
        }

        async function cargarProductos() {
            try {
                const res = await apiFetch(`/productos/`);
                if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudieron cargar los productos."));
                const data: ProductoConId[] = await res.json();
                // los dados de baja no se pueden mostrar, así que ni se ofrecen
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

        sincronizarInterruptor();
        cargarProductos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identificadorUnico]);

    useEffect(() => {
        onSeleccionChange?.([...seleccion]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seleccion]);

    const hayCambios = useMemo(
        () => seleccion.size !== guardados.size || [...seleccion].some(id => !guardados.has(id)),
        [seleccion, guardados]
    );

    async function handleToggleProductos(nuevoValor: boolean) {
        setErrorMsg(null);
        setSuccessMsg(null);
        actualizarConfig('verProductos', nuevoValor);
        if (modoHabilitacion) return; // se guarda al crear el QR
        try {
            const res = await apiFetch(`/identificadorQR/${identificadorUnico}/ver-productos`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verProductos: nuevoValor }),
            });
            if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudo actualizar el listado de productos."));
        } catch (err: unknown) {
            actualizarConfig('verProductos', !nuevoValor); // se vuelve atrás si el backend no lo guardó
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        }
    }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
                <input
                    type="checkbox"
                    className="switch-input"
                    checked={config.verProductos}
                    onChange={(e) => handleToggleProductos(e.target.checked)}
                />
                <span style={{ ...textoClaro, cursor: 'pointer' }} onClick={() => handleToggleProductos(!config.verProductos)}>
                    Mostrar listado de productos
                </span>
            </div>

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

                    <div className="tabla-wrapper" style={{ maxHeight: '220px', overflowY: 'auto', opacity: config.verProductos ? 1 : 0.55 }}>
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
