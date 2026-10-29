import { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { QRCodeCanvas } from 'qrcode.react';
import { useVistaPublica } from './contextDeVistaPublica';
import type { AcercaDeNosotrosConId } from './tipos';

interface ActivarVistaProps{
    onSuccess?: (qrBlobUrl: string,idAlfanumerico:string) => void;
    onCancel?: () => void;
}


const ACERCADENOSOTROS_INICIAL: AcercaDeNosotrosConId = {
    id: 0,
    descripcion: ""
};


export default function ActivarVista_Publica({onSuccess,onCancel}:ActivarVistaProps){
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const { config, actualizarConfig } = useVistaPublica();

    const [formNosotros, setFormNosotros] = useState<AcercaDeNosotrosConId>(ACERCADENOSOTROS_INICIAL);



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
    setFormNosotros({...formNosotros, [e.target.name]: e.target.value})

}

    const payload = {
        version: 1,
        box_size: 10,
        boder: 4,
        color_fill: "black", 
        color_back: "white",
        texto:`http://192.168.1.42:5173/vista-publica?verGrafico=${config.verGrafico}&verAcercaDeNosotros=${config.verAcercaDeNosotros}`,
        ver_grafico: config.verGrafico,
        verAcercaDeNosotros: config.verAcercaDeNosotros
    }

    const modulosBase = 21 + ((payload.version - 1) * 4);
    const tamanoRealPixels = (modulosBase + (payload.boder * 2)) * payload.box_size;


    async function handleGuardar() {

        setErrorMsg(null);
        setSuccessMsg(null);


        setLoading(true);

        function soloLetrasYNumeros(nombre:string): boolean{

        const patron=/^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s-]+$/;
        return patron.test(nombre);
    }

    if(!formNosotros.descripcion.trim()) {
        setErrorMsg("La descripcion no puede estar vacío.");
        return;
    }

    if(!soloLetrasYNumeros(formNosotros.descripcion.trim())) {
        setErrorMsg("La descripcion solo puede contener letras , números y caracteres permitidos.");
        return;
    }

        try {
            const res = await apiFetch(`/quickCode/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if(!res.ok) {

                const errorData = await res.json().catch(() => ({}));
                let mensaje = "Error al habilitar la vista Publica.";

                if (typeof errorData.detail === "string") {
            mensaje = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
            mensaje = errorData.detail
                .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                .join(", ");
            }
            throw new Error(mensaje);
        }

            if (formNosotros.id && formNosotros.id > 0) {
                // Si ya tiene un ID guardado, hacemos PUT enviando el ID en la URL
                const resNosotros = await apiFetch(`/acercaDeNosotros/${formNosotros.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ descripcion: formNosotros.descripcion }),
                });

                if(!resNosotros.ok) {
                    const errorData = await resNosotros.json().catch(() => ({}));
                    let mensaje = "Error al actualizar la descripción de Nosotros.";
                    if (typeof errorData.detail === "string") {
                        mensaje = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        mensaje = errorData.detail
                            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                            .join(", ");
                    }
                    throw new Error(mensaje);
                }
            } else {
                // Si no tiene ID (es la primera vez), hacemos POST
                const resNosotros = await apiFetch(`/acercaDeNosotros/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ descripcion: formNosotros.descripcion }),
                });

                if(!resNosotros.ok) {
                    const errorData = await resNosotros.json().catch(() => ({}));
                    let mensaje = "Error al guardar la descripción de Nosotros.";
                    if (typeof errorData.detail === "string") {
                        mensaje = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        mensaje = errorData.detail
                            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
                            .join(", ");
                    }
                    throw new Error(mensaje);
                }
            }
        const idAlfanumerico = res.headers.get("X-Identificador-Unico");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setSuccessMsg("Vista Publica habilitada exitosamente");
        if (idAlfanumerico) {
            onSuccess?.(url, idAlfanumerico);
        } else {
            setErrorMsg("No se pudo recuperar el identificador único del QR.");
        }



        }catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        }finally {
            setLoading(false);
        } 

    }

    function handleCancelar() {
        setErrorMsg(null);
        setSuccessMsg(null);
        setFormNosotros(ACERCADENOSOTROS_INICIAL);
        onCancel?.();
    }


    return(
        <div className="modulo-container formulario-box" style={{ padding: '15px' }}>

            <div className="modulo-header" style={{ marginBottom: '5px' }}>
                <h1 style={{ fontSize: '30px', whiteSpace: 'nowrap', margin: '0'}}>Habilitacion de vista Publica</h1>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}
            {successMsg && <div className="alerta-exito">{successMsg}</div>}

        <div className="modal-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            <div className="form-acciones" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button type="button" className="btn-guardar"  onClick={handleGuardar} disabled={loading}>
                {loading ? "Habilitando..." : "Habilitar"}
            </button>
            </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
        <input 
            type="checkbox" 
            className="switch-input"
            checked={config.verGrafico} 
            onChange={(e) => actualizarConfig('verGrafico', e.target.checked)} 
        />
        <span style={{ color: '#fff', fontSize: '13px', userSelect: 'none', cursor: 'pointer' }} onClick={() => actualizarConfig('verGrafico', !config.verGrafico)}>
            Mostrar Gráfico de Tareas
        </span>
    </div>

    <div className="form-group">
      <label htmlFor="descripcion">Descripción</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
          <input 
            type="checkbox" 
            className="switch-input"
            checked={config.verAcercaDeNosotros} 
            onChange={(e) => actualizarConfig('verAcercaDeNosotros', e.target.checked)} 
            />
        <span style={{ color: '#fff', fontSize: '13px', userSelect: 'none', cursor: 'pointer' }} onClick={() => actualizarConfig('verAcercaDeNosotros', !config.verAcercaDeNosotros)}>
            Mostrar
            </span>
        </div>
          <textarea
            className="descripcion"
            id="descripcion"
            name="descripcion"
            rows={4}
            placeholder="Introduce la descripción"
            value={formNosotros.descripcion}
            onChange={handleDescripcionChange}
            
            required
          />
        </div>


                <div className="qr-preview-container" style={{ textAlign: 'center', padding: '5px', borderRadius: '8px' }}>
                    <p className="form-group">Previsualización del QR predeterminado</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: '6px', borderRadius: '6px', width: 'fit-content', margin: '0 auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <QRCodeCanvas
                            value={payload.texto}
                            size={tamanoRealPixels}
                            bgColor={payload.color_back}
                            fgColor={payload.color_fill}
                            level={"H"}
                            marginSize ={payload.boder}
                            minVersion={payload.version}
                        />
                    </div>

                </div>

        <div className="form-acciones" >
         <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
            </button>
        </div>
        </div>
    </div>
)

}