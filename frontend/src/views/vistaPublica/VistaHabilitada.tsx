import { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';
import type { AcercaDeNosotrosConId } from './tipos';
import ConfiguracionProductosPublicos from './configuracionProductos';

interface VistaHabilitadaProps{
    qrUrl: string | null;
    urlEnlace?: string | null;
    identificadorUnico?: string | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const ACERCADENOSOTROS_INICIAL: AcercaDeNosotrosConId = {
    id: 0,
    descripcion: ""
};

export default function VistaPublica_Habilitada({qrUrl,urlEnlace,identificadorUnico,onSuccess,onCancel}:VistaHabilitadaProps){
    const [loading,setLoading]=useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const { config, actualizarConfig } = useVistaPublica();

    const [formNosotros, setFormNosotros] = useState<AcercaDeNosotrosConId>(ACERCADENOSOTROS_INICIAL);
    const [editando, setEditando] = useState(false);
    const handleDescripcionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleChange(e);
        const target = e.target;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
};

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

function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormNosotros({...formNosotros, [e.target.name]: e.target.value})

}

async function handleGuardarEdicion() {
        setErrorMsg(null);
        setSuccessMsg(null);

        function soloLetrasYNumeros(nombre: string): boolean {
            const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s-]+$/;
            return patron.test(nombre);
        }

        if (!formNosotros.descripcion.trim()) {
            setErrorMsg("La descripción no puede estar vacía.");
            return;
        }

        if (!soloLetrasYNumeros(formNosotros.descripcion.trim())) {
            setErrorMsg("La descripción solo puede contener letras, números, espacios y guiones.");
            return;
        }

        if (!formNosotros.id || formNosotros.id === 0) {
            setErrorMsg("No se encontró el ID del registro para actualizar.");
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch(`/acercaDeNosotros/${formNosotros.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ descripcion: formNosotros.descripcion }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                let mensaje = "Error al actualizar la descripción.";
                if (typeof errorData.detail === "string") {
                    mensaje = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    mensaje = errorData.detail
                        .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                        .join(", ");
                }
                throw new Error(mensaje);
            }

            setSuccessMsg("Descripción actualizada exitosamente.");
            setEditando(false);
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    }

const handleCopiarEnlace = () => {
        if (urlEnlace) {
            navigator.clipboard.writeText(urlEnlace);
            setSuccessMsg("¡Enlace copiado al portapapeles!");
            setTimeout(() => setSuccessMsg(null), 3000);
        }
    };
    
function handleDescargarQR() {
        if (!qrUrl) return;

        // Creamos un elemento <a> temporal en el navegador
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = 'codigo-qr-vista-publica.png'; // Nombre con el que se descargará la imagen
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
async function handleDesactivar(){
    setLoading(true); 
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
            const res = await apiFetch(`/identificadorQR/${identificadorUnico}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if(!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                let mensaje = "Error al desactivar la vista publica.";
                if (typeof errorData.detail === "string") {
                  mensaje = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                  mensaje = errorData.detail
                    .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                    .join(", ");
                }
                throw new Error(mensaje);
            }
    
            setSuccessMsg("desahabilitado exitosamente.");
            onSuccess?.();
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }


}


 async function handleToggleGrafico(nuevoValor: boolean) {
    actualizarConfig('verGrafico',nuevoValor); // Lo cambia visualmente en tu PC al instante

    try {
        await apiFetch(`/identificadorQR/${identificadorUnico}/ver-grafico`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ver_grafico: nuevoValor }),
        });
    } catch (err) {
        console.error("Error al actualizar el estado del gráfico:", err);
    }
}

async function handleToggleAcercaDeNosotros(nuevoValor: boolean) {
    actualizarConfig('verAcercaDeNosotros',nuevoValor); // Lo cambia visualmente en tu PC al instante

    try {
        await apiFetch(`/identificadorQR/${identificadorUnico}/ver-acercaDeNosotros`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verAcercaDeNosotros: nuevoValor }),
        });
    } catch (err) {
        console.error("Error al actualizar el estado del gráfico:", err);
    }
}
function handleCancelar() {
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}


return (
    <div className="modulo-container formulario-box vista-publica-config">

        <div className="config-top-row">
            <div className="config-header-main">
                <h1 className="config-titulo-principal">Desactivación de vista Pública</h1>
                <button type="button" className="btn-guardar btn-desactivar" onClick={handleDesactivar} disabled={loading}>
                    {loading ? "Desactivando..." : "Desactivar Vista Pública"}
                </button>
            </div>

            <div className="config-seccion">
                <h3 className="config-subtitulo">Configuración</h3>

                <div className="config-switch-item">
                    <input 
                        type="checkbox" 
                        className="switch-input"
                        id="switch-grafico"
                        checked={config.verGrafico} 
                        onChange={(e) => handleToggleGrafico(e.target.checked)} 
                    />
                    <label htmlFor="switch-grafico" className="config-switch-label" onClick={() => handleToggleGrafico(!config.verGrafico)}>
                        Mostrar Gráfico de Tareas
                    </label>
                </div>

                <div className="config-switch-item">
                    <input 
                        type="checkbox" 
                        className="switch-input"
                        id="switch-nosotros"
                        checked={config.verAcercaDeNosotros} 
                        onChange={(e) => handleToggleAcercaDeNosotros(e.target.checked)}
                    />
                    <label htmlFor="switch-nosotros" className="config-switch-label" onClick={() => handleToggleAcercaDeNosotros(!config.verAcercaDeNosotros)}>
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

        {errorMsg && <div className="alerta-error">{errorMsg}</div>}
        {successMsg && <div className="alerta-exito">{successMsg}</div>}

  
        <div className="config-bottom-grid">
            
         
            <div className="columna-izquierda">
                <div className="textarea-container-angosto">
                    <div className="textarea-header-row">
                        <label htmlFor="descripcion" className="textarea-label-titulo">Acerca de Nosotros</label>
                        <button 
                            type="button" 
                            onClick={() => setEditando(!editando)}
                            className="btn-icon btn-editar"
                            title="Editar descripción"
                        >
                            ✎
                        </button>
                    </div>

                    <textarea
                        className="descripcion"
                        id="descripcion"
                        name="descripcion"
                        placeholder="Introduce la descripción"
                        value={formNosotros.descripcion}
                        disabled={!editando}
                        onChange={handleDescripcionChange}
                    />

                    {editando && (
                        <button 
                            type="button" 
                            className="btn-guardar btn-guardar-descripcion" 
                            onClick={handleGuardarEdicion}
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : "Guardar Descripción 💾"}
                        </button>
                    )}
                </div>

                <ConfiguracionProductosPublicos identificadorUnico={identificadorUnico} />

                <div className="contenedor-cancelar-izq">
                    <button type="button" className="btn-cancelar" onClick={handleCancelar}>
                        Cancelar
                    </button>
                </div>
            </div>

            <div className="qr-columna-derecha">
                <div className="qr-preview-container-original">
                    <p className="qr-titulo-activo">Código QR activo</p>
                    
                    <div className="qr-image-box-original">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR Habilitado" className="qr-imagen-original" />
                        ) : (
                            <p>No hay QR disponible</p>
                        )}
                    </div>
                </div>

                <div className="form-acciones-finales-qr">
                    <button 
                        type="button" 
                        className="btn-guardar" 
                        onClick={handleDescargarQR}
                    >
                        Descargar QR 📥
                    </button>
                </div>

                {urlEnlace && (
                    <div className="enlace-acceso-derecha">
                        <label className="textarea-label-titulo enlace-label-chico">Enlace de acceso directo:</label>
                        <div className="enlace-fila-control">
                            <a 
                                href={urlEnlace} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="descripcion enlace-estilo-link" 
                                title="Hacer clic para abrir en otra pestaña"
                            >
                                {urlEnlace} ↗
                            </a>
                            <button 
                                type="button" 
                                className="btn-guardar enlace-btn-copiar" 
                                onClick={handleCopiarEnlace}
                                title="Copiar enlace"
                            >
                                Copiar 📋
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    </div>
)

}