import {useState} from "react"
import type {Equipo} from "./tipos"
import "../styles/formularioAlta.css"

const CATEGORIAS= ["conservamiento","sanamiento","mantenimiento","desinfeccion"];
const EQUIPO_INICIAL :Equipo={
        nombre: "",
        categoria: "",
        ubicacion: "",
        plan_de_Limpieza: "",
        plan_de_calibracion: ""
    };
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface NuevoEquipoProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function NuevoEquipo({ onSuccess, onCancel }: NuevoEquipoProps) {
    const [equipo, setEquipo] = useState<Equipo>(EQUIPO_INICIAL);
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
        const res= await fetch(`${API_URL}/equipos/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(equipo),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            setErrorMsg(errorData.detail || "Error al guardar el equipo");
        }

        setSuccessMsg("Equipo dado de alta exitosamente");
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


return(
    <div className="modulo-container formulario-box">
        <div className="modulo-header">
            <h1>Nuevo Equipo</h1>
            <div className="subtitulo">02 . Formulario</div>
        </div>

        {errorMsg && <div className="alerta-error">{errorMsg}</div>}
        {successMsg && <div className="alerta-exito">{successMsg}</div>}

        <form onSubmit={handleGuardar}>
            <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    placeholder="Introduzca el nombre del equipo"
                    value={equipo.nombre}
                    onChange={handleChange}
                    required    
                />
            </div>
            <div className="form-group">
                <label htmlFor="categoria">Categoría:</label>
                <select
                    id="categoria"
                    name="categoria"
                    value={equipo.categoria}
                    onChange={handleChange}
                    required
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
                    required    
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
                    required    
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
                    required    
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
    </div>
        
)
}