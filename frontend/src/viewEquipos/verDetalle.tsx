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
        <div className="modulo-container">
            <div className="listado-top-bar">
              <div className="modulo-header">
                <h1>Detalle de Equipo</h1>
                <div className="subtitulo">Equipo:{equipoId}</div>
                </div>
         </div>

         <div className="tabla-wrapper">
            <table className="tabla-custom">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoria</th>
                        <th>Ubicación</th>
                        <th>Plan de Limpieza</th>
                        <th>Plan de Calibración</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={1} style={{ textAlign: 'center', padding: '2rem' }}>
                                Cargando equipo...
                            </td>
                        </tr>
                    ) : equipo ? (
                        <tr>
                            <td>{equipo.nombre}</td>
                            <td>{equipo.categoria}</td>
                            <td>{equipo.ubicacion}</td>
                            <td>{equipo.plan_de_Limpieza}</td>
                            <td>{equipo.plan_de_calibracion}</td>
                        </tr>
                    ) : (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                El equipo no existe.
                            </td>
                        </tr>
                    )}
                                   <div className="form-acciones"> 
                                    <button type="button"  className="btn-cancelar" onClick={onCancel}>
                                            Volver
                                    </button>
                                  </div>
                </tbody>
            </table>
         </div>
        </div>
    );

};