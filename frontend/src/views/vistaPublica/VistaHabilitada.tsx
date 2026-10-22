import { useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface VistaHabilitadaProps{
    qrUrl: string | null;
    identificadorUnico?: string | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}


export default function VistaPublica_Habilitada({qrUrl,identificadorUnico,onSuccess,onCancel}:VistaHabilitadaProps){
    const [loading,setLoading]=useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          <button type="button" className="btn-guardar" onClick={handleDesactivar} disabled={loading}>
                {loading ? "Desactivando..." : "Desactivar Vista Publica"}
          </button>
        </div>


                <div className="qr-preview-container" style={{ textAlign: 'center', padding: '5px', borderRadius: '8px' }}>
                    <p className="form-group" style={{ fontSize: '13px', color: '#e0e0e0' }}>Código QR activo</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: '6px', borderRadius: '6px', width: 'fit-content', margin: '0 auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR Habilitado" style={{ width: '300px', height: '300px', display: 'block' }} />
                        ) : (
                            <p>No hay QR disponible</p>
                        )}
                    </div>
                </div>

        <div className="form-acciones" >
            <button 
                       type="button" 
                       className="btn-guardar" 
                       onClick={handleDescargarQR}
                   >
                      Descargar QR📥
                   </button>
         <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
            </button>
        </div>
        </div>
    </div>
)

}