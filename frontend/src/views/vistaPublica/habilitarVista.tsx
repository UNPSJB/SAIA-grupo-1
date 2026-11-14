import { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { QRCodeCanvas } from 'qrcode.react';
import { useVistaPublica } from './contextDeVistaPublica';
import type { AcercaDeNosotrosConId } from './tipos';
import ConfiguracionProductosPublicos from './configuracionProductos';

interface ActivarVistaProps{
    onSuccess?: (qrBlobUrl: string, idAlfanumerico: string, urlTexto: string) => void;
    onCancel?: () => void;
}

const ACERCADENOSOTROS_INICIAL: AcercaDeNosotrosConId = {
    id: 0,
    descripcion: ""
};

export default function ActivarVista_Publica({ onSuccess, onCancel }: ActivarVistaProps){
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const { config, actualizarConfig } = useVistaPublica();

    const [formNosotros, setFormNosotros] = useState<AcercaDeNosotrosConId>(ACERCADENOSOTROS_INICIAL);
    const [productosVisibles, setProductosVisibles] = useState<number[]>([]);

    useEffect(() => {
        async function cargarAcercaDeNosotros() {
            try {
                const res = await apiFetch(`/acercaDeNosotros/`);
                if (res.ok) {
                    const data = await res.json();
                    const registro = Array.isArray(data) ? data[0] : data;
                    if (registro) {
                        setFormNosotros({
                            id: registro.id,
                            descripcion: registro.descripcion || ""
                        });

                        const textarea = document.getElementById('descripcion') as HTMLTextAreaElement;
                        if (textarea) {
                            textarea.style.height = "auto";
                            textarea.style.height = `${textarea.scrollHeight}px`;
                        }
                    }
                }
            } catch (err) {
                console.error("Error al cargar la descripción de nosotros:", err);
            }
        }
        cargarAcercaDeNosotros();
    }, []);

    const handleDescripcionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleChange(e);
        const target = e.target;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
    };

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setFormNosotros({...formNosotros, [e.target.name]: e.target.value});
    }

    const payload = {
        version: 1,
        box_size: 10,
        boder: 4,
        color_fill: "black", 
        color_back: "white",
        texto: `${window.location.origin}/vista-publica?verGrafico=${config.verGrafico}&verAcercaDeNosotros=${config.verAcercaDeNosotros}`,
        ver_grafico: config.verGrafico,
        verAcercaDeNosotros: config.verAcercaDeNosotros,
        verProductos: config.verProductos,
        ver_dias_sin_incidentes: config.verDiasSinIncidentes,
        ver_total_lotes: config.verTotalLotes,
        ver_volumen_fabricado: config.verVolumenFabricado,
        ver_producto_mas_elaborado: config.verProductoMasElaborado,
        ver_grafico_totales_productos: config.verGraficoTotalesProductos,
        ver_grafico_red_arana: config.verGraficoRedArana
    };

    const modulosBase = 21 + ((payload.version - 1) * 4);
    const tamanoRealPixels = (modulosBase + (payload.boder * 2)) * payload.box_size;

    async function handleGuardar() {
        setErrorMsg(null);
        setSuccessMsg(null);

        function soloLetrasYNumeros(nombre: string): boolean {
            const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s,.\-():;'"/]+$/;
            return patron.test(nombre);
        }

        if (!formNosotros.descripcion.trim()) {
            setErrorMsg("La descripcion no puede estar vacío.");
            return;
        }

        if (!soloLetrasYNumeros(formNosotros.descripcion.trim())) {
            setErrorMsg("La descripcion solo puede contener letras , números y caracteres permitidos.");
            return;
        }

        setLoading(true);

        try {
            const res = await apiFetch(`/quickCode/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                let mensaje = "Error al habilitar la vista Publica.";
                if (typeof errorData.detail === "string") {
                    mensaje = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    mensaje = errorData.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(", ");
                }
                throw new Error(mensaje);
            }

            if (formNosotros.id && formNosotros.id > 0) {
                const resNosotros = await apiFetch(`/acercaDeNosotros/${formNosotros.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descripcion: formNosotros.descripcion }),
                });

                if (!resNosotros.ok) {
                    const errorData = await resNosotros.json().catch(() => ({}));
                    let mensaje = "Error al actualizar la descripción de Nosotros.";
                    if (typeof errorData.detail === "string") {
                        mensaje = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        mensaje = errorData.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(", ");
                    }
                    throw new Error(mensaje);
                }
            } else {
                const resNosotros = await apiFetch(`/acercaDeNosotros/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descripcion: formNosotros.descripcion }),
                });

                if (!resNosotros.ok) {
                    const errorData = await resNosotros.json().catch(() => ({}));
                    let mensaje = "Error al guardar la descripción de Nosotros.";
                    if (typeof errorData.detail === "string") {
                        mensaje = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        mensaje = errorData.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(", ");
                    }
                    throw new Error(mensaje);
                }
            }

            if (config.verProductos) {
                const resProductos = await apiFetch(`/productos/visibilidad-publica`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productos_visibles: productosVisibles }),
                });
                if (!resProductos.ok) {
                    const errorData = await resProductos.json().catch(() => ({}));
                    throw new Error(typeof errorData.detail === "string" ? errorData.detail : "Error al guardar los productos a mostrar.");
                }
            }

            const idAlfanumerico = res.headers.get("X-Identificador-Unico");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const urlTextoCompleta = idAlfanumerico 
                ? `${window.location.origin}/vista-publica/${idAlfanumerico}?verGrafico=${config.verGrafico}&verAcercaDeNosotros=${config.verAcercaDeNosotros}`
                : payload.texto;
            
            setSuccessMsg("Vista Publica habilitada exitosamente");
            if (idAlfanumerico) {
                onSuccess?.(url, idAlfanumerico, urlTextoCompleta);
            } else {
                setErrorMsg("No se pudo recuperar el identificador único del QR.");
            }
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        } 
    }

    function handleCancelar() {
        setErrorMsg(null);
        setSuccessMsg(null);
        setFormNosotros(ACERCADENOSOTROS_INICIAL);
        onCancel?.();
    }

    return (
        <div className="modulo-container formulario-box vista-publica-config">

            <div className="config-top-row">
                <div className="config-header-main">
                    <h1 className="config-titulo-principal">Habilitacion de vista Publica</h1>
                    <button type="button" className="btn-guardar btn-desactivar" onClick={handleGuardar} disabled={loading}>
                        {loading ? "Habilitando..." : "Habilitar"}
                    </button>
                </div>

                {/* Tarjeta de Configuración con los tres switches incluidos */}
                <div className="config-seccion">
                    <h3 className="config-subtitulo">Configuración</h3>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-grafico"
                            checked={config.verGrafico} 
                            onChange={(e) => actualizarConfig('verGrafico', e.target.checked)} 
                        />
                        <label htmlFor="switch-grafico" className="config-switch-label" onClick={() => actualizarConfig('verGrafico', !config.verGrafico)}>
                            Mostrar Gráfico de Tareas
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-grafico-red-arana"
                            checked={config.verGraficoRedArana} 
                            onChange={(e) => actualizarConfig('verGraficoRedArana', e.target.checked)} 
                        />
                        <label htmlFor="switch-grafico-red-arana" className="config-switch-label" onClick={() => actualizarConfig('verGraficoRedArana', !config.verGraficoRedArana)}>
                            Mostrar Red de Araña (Limpieza)
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-grafico-totales"
                            checked={config.verGraficoTotalesProductos} 
                            onChange={(e) => actualizarConfig('verGraficoTotalesProductos', e.target.checked)} 
                        />
                        <label htmlFor="switch-grafico-totales" className="config-switch-label" onClick={() => actualizarConfig('verGraficoTotalesProductos', !config.verGraficoTotalesProductos)}>
                            Mostrar Totales de Productos Elaborados
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-dias-sin-incidentes"
                            checked={config.verDiasSinIncidentes} 
                            onChange={(e) => actualizarConfig('verDiasSinIncidentes', e.target.checked)} 
                        />
                        <label htmlFor="switch-dias-sin-incidentes" className="config-switch-label" onClick={() => actualizarConfig('verDiasSinIncidentes', !config.verDiasSinIncidentes)}>
                            Tarjeta: Días sin incidentes
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-total-lotes"
                            checked={config.verTotalLotes} 
                            onChange={(e) => actualizarConfig('verTotalLotes', e.target.checked)} 
                        />
                        <label htmlFor="switch-total-lotes" className="config-switch-label" onClick={() => actualizarConfig('verTotalLotes', !config.verTotalLotes)}>
                            Tarjeta: Total de lotes
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-volumen-fabricado"
                            checked={config.verVolumenFabricado} 
                            onChange={(e) => actualizarConfig('verVolumenFabricado', e.target.checked)} 
                        />
                        <label htmlFor="switch-volumen-fabricado" className="config-switch-label" onClick={() => actualizarConfig('verVolumenFabricado', !config.verVolumenFabricado)}>
                            Tarjeta: Volumen fabricado
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-producto-lider"
                            checked={config.verProductoMasElaborado} 
                            onChange={(e) => actualizarConfig('verProductoMasElaborado', e.target.checked)} 
                        />
                        <label htmlFor="switch-producto-lider" className="config-switch-label" onClick={() => actualizarConfig('verProductoMasElaborado', !config.verProductoMasElaborado)}>
                            Tarjeta: Producto más elaborado
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-nosotros"
                            checked={config.verAcercaDeNosotros} 
                            onChange={(e) => actualizarConfig('verAcercaDeNosotros', e.target.checked)}
                        />
                        <label htmlFor="switch-nosotros" className="config-switch-label" onClick={() => actualizarConfig('verAcercaDeNosotros', !config.verAcercaDeNosotros)}>
                            Mostrar Acerca de Nosotros
                        </label>
                    </div>

                    <div className="config-switch-item">
                        <input 
                            type="checkbox" 
                            className="switch-input"
                            id="switch-productos"
                            checked={config.verProductos} 
                            onChange={(e) => actualizarConfig('verProductos', e.target.checked)}
                        />
                        <label htmlFor="switch-productos" className="config-switch-label" onClick={() => actualizarConfig('verProductos', !config.verProductos)}>
                            Mostrar listado de productos
                        </label>
                    </div>
                </div>
            </div>

            
            
           
            <div className="config-bottom-grid">
                
                <div className="columna-izquierda">
                    {errorMsg && <div className="alerta-error">{errorMsg}</div>}
                    {successMsg && <div className="alerta-exito">{successMsg}</div>}
                    <div className="textarea-container-angosto">
                        <div className="textarea-header-row">
                            <label htmlFor="descripcion" className="textarea-label-titulo">Acerca de Nosotros</label>
                        </div>

                        <textarea
                            className="descripcion"
                            id="descripcion"
                            name="descripcion"
                            placeholder="Introduce la descripción"
                            value={formNosotros.descripcion}
                            onChange={handleDescripcionChange}
                            required
                        />
                    </div>

                    <ConfiguracionProductosPublicos onSeleccionChange={setProductosVisibles} />
                </div>

                <div className="qr-columna-derecha">
                    <div className="qr-preview-container-original">
                        <p className="qr-titulo-activo">Previsualización del QR predeterminado</p>
                        
                        <div className="qr-image-box-original">
                            <QRCodeCanvas
                                value={payload.texto}
                                size={tamanoRealPixels}
                                bgColor={payload.color_back}
                                fgColor={payload.color_fill}
                                level={"H"}
                                marginSize={payload.boder}
                                minVersion={payload.version}
                            />
                        </div>
                    </div>
                </div>

            </div>
            <div className="form-acciones">
                <button type="button" className="btn-cancelar" onClick={handleCancelar}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}