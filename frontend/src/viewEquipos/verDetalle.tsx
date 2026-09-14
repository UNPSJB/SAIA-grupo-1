import React, { useEffect,useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../styles/formularioAlta.css';

interface DetalleEquipoProps {
    onCancel?: () => void;
    equipoId?: number | null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const DetalleEquipo: React.FC<DetalleEquipoProps> = ({ onCancel, equipoId }) => {
    const [equipo, setEquipo] = useState<EquipoConId | null>(null);
    const [loading, setLoading] = useState(true);

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

    return (
    <div className="modulo-container formulario-box">
        <div className="modulo-header">
            <h1>Detalle Equipo</h1>
            <div className="subtitulo">Equipo: {equipoId}</div>
        </div>

            {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando equipo...
                            </td>
                        </tr>
        ) : equipo ? (
        <form >
            <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={equipo.nombre}
                    disabled 
                />
            </div>
            <div className="form-group">
                <label htmlFor="categoria">Categoría:</label>
                <input
                    id="categoria"
                    name="categoria"
                    value={equipo.categoria}
                    disabled
                >
                </input>
            </div>

            <div className="form-group">
                <label htmlFor="ubicacion">Ubicación</label>
                <input
                    id="ubicacion"
                    name="ubicacion"
                    type="text"
                    value={equipo.ubicacion}
                    disabled
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_Limpieza">Plan de Limpieza</label>
                <input
                    id="plan_de_Limpieza"
                    name="plan_de_Limpieza"
                    type="text"
                    value={equipo.plan_de_Limpieza}
                    disabled
                />
            </div>

            <div className="form-group">
                <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
                <input
                    id="plan_de_calibracion"
                    name="plan_de_calibracion"
                    type="text"
                    value={equipo.plan_de_calibracion} 
                    disabled
                />
            </div>
        </form>
        ) : (
                <tr>
                     <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                             El equipo no existe.
                        </td>
                </tr>
                )}

                <div className="form-acciones">
                <button type="button"  className="btn-cancelar" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        
    </div>
    
        
)

};