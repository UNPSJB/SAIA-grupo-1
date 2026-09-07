import React, { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../styles/formularioAlta.css';


const CATEGORIAS= ["conservamiento","sanamiento","mantenimiento","desinfeccion"];
const EQUIPO_INICIAL :EquipoConId={
        id: 0,
        nombre: "",
        categoria: "",
        ubicacion: "",
        plan_de_Limpieza: "",
        plan_de_calibracion: ""
    };
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface EditarEquipoProps {
    equipoId: number | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function EditarEquipo({ equipoId, onSuccess, onCancel }: EditarEquipoProps) {
    const [equipo, setEquipo] = useState<EquipoConId>(EQUIPO_INICIAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setEquipo({...equipo, [e.target.name]: e.target.value})
}

async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
        const res= await fetch(`${API_URL}/equipos/${equipoId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(equipo),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            setErrorMsg(errorData.detail || "Error al guardar el equipo");
        }

        setSuccessMsg("Equipo editado exitosamente");
        setEquipo(EQUIPO_INICIAL);
        onSuccess?.();
    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    }
   
}

function handleCancelar() {
    setEquipo(EQUIPO_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}

useEffect(() => {
        if (equipoId) {
            const fetchEquipo = async () => {
                try {
                    const res = await fetch(`${API_URL}/equipos/${equipoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setEquipo(data);
                    }
                } catch {
                    alert('El equipo no existe.');
                } finally {
                    setLoading(false);
                }
            };

            fetchEquipo();
        }
    }, [equipoId]);

return(
    <div className="modulo-container formulario-box">
        <div className="modulo-header">
            <h1>Editar Equipo</h1>
            <div className="subtitulo">03 . Editar</div>
        </div>

        {errorMsg && <div className="alerta-error">{errorMsg}</div>}
        {successMsg && <div className="alerta-exito">{successMsg}</div>}
            {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando equipo...
                            </td>
                        </tr>
        ) : equipo ? (
        <form onSubmit={handleGuardar}>
            <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={equipo.nombre}
                    onChange={handleChange}    
                />
            </div>
            <div className="form-group">
                <label htmlFor="categoria">Categoría:</label>
                <select
                    id="categoria"
                    name="categoria"
                    value={equipo.categoria}
                    onChange={handleChange}
                >
                    <option value="" disabled>Seleccione una categoría</option>
                    {CATEGORIAS.map((categoria) => (
                        <option key={categoria} value={categoria}>
                            {categoria}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="ubicacion">Ubicación</label>
                <input
                    id="ubicacion"
                    name="ubicacion"
                    type="text"
                    value={equipo.ubicacion}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_Limpieza">Plan de Limpieza</label>
                <input
                    id="plan_de_Limpieza"
                    name="plan_de_Limpieza"
                    type="text"
                    value={equipo.plan_de_Limpieza}
                    onChange={handleChange}  
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
                <input
                    id="plan_de_calibracion"
                    name="plan_de_calibracion"
                    type="text"
                    value={equipo.plan_de_calibracion}
                    onChange={handleChange}  
                />
            </div>

            <div className="form-acciones">
                <button type="submit" className="btn-guardar" disabled={loading}>
                    {loading ? "Guardando..." : "Guardar"}
                </button>
                <button type="button"  className="btn-cancelar" onClick={handleCancelar}>
                    Cancelar
                </button>
            </div>
        </form>
        ) : (
                <tr>
                     <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                             El equipo no existe.
                        </td>
                </tr>
                )}
        
    </div>
    
        
)
}