import { useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { QRCodeCanvas } from 'qrcode.react';

interface ActivarVistaProps{
    onSuccess?: (qrBlobUrl: string) => void;
    onCancel?: () => void;
}


export default function ActivarVista_Publica({onSuccess,onCancel}:ActivarVistaProps){
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);


    const payload = {
        version: 1,
        box_size: 10,
        boder: 4,
        color_fill: "black", 
        color_back: "white",
        texto:"https://www.youtube.com/"
    }

    const modulosBase = 21 + ((payload.version - 1) * 4);
    const tamanoRealPixels = (modulosBase + (payload.boder * 2)) * payload.box_size;


async function handleGuardar() {

    setErrorMsg(null);
    setSuccessMsg(null);


    setLoading(true);

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
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setSuccessMsg("Vista Publica habilitada exitosamente");
    onSuccess?.(url);



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    } 

}

function handleCancelar() {
    setErrorMsg(null);
    setSuccessMsg(null);
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
          <button type="submit" className="btn-guardar"  onClick={handleGuardar} disabled={loading}>
            {loading ? "Habilitando..." : "Habilitar"}
          </button>
          <button type="button" className="btn-guardar">EditarQr</button>
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