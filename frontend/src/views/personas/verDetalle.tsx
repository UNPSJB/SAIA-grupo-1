import React, { useEffect, useState } from "react";
import type { Persona } from "./tipos";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import '../../styles/formularioAlta.css';

export interface DetallePersonaProps {
  personaLegajo: number | null;
  onCancel: () => void;
}

export const DetallePersona: React.FC<DetallePersonaProps> = ({
  personaLegajo,
  onCancel,
}) => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!personaLegajo) return;
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await apiFetch(`/personal/${personaLegajo}`, {
          headers: { "Accept": "application/json" }
        });
        if (!cancelado && res.ok) {
          const data: Persona = await res.json();
          setPersona(data);
          setErrorCarga(null);
        } else if (!cancelado) {
          setErrorCarga("No se pudo obtener la información de la persona.");
        }
      } catch (err) {
        console.error("Error en verDetalle:", err);
        if (!cancelado) setErrorCarga("Error al conectar con el servidor.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [personaLegajo]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de la Persona</h1>
        <div className="subtitulo">
          {persona ? `${persona.apellido}, ${persona.nombre} (Legajo #${persona.legajo})` : "04 · Consulta"}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando detalles de la persona...</div>
      ) : errorCarga || !persona ? (
        <div className="alerta-error">{errorCarga || "Persona no encontrada."}</div>
      ) : (
        <div>
          <div className="form-group">
            <label htmlFor="legajo">Legajo</label>
            <input id="legajo" value={persona.legajo} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input id="usuario" value={persona.usuario} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombreCompleto">Apellido y Nombre</label>
            <input id="nombreCompleto" value={`${persona.apellido}, ${persona.nombre}`} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="documento">DNI / Documento</label>
            <input id="documento" value={persona.documento ?? persona.dni ?? ""} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" value={persona.email} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="capacidad">Capacidad</label>
            <input id="capacidad" value={persona.capacidad || "-"} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="tareas">Tareas asignadas</label>
            <input id="tareas" value={persona.tareas?.map((t) => t.nombre).join(", ") || "sin tareas"} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            <div>
              <Badge variant={persona.activo ? "activo" : "inactivo"}>
                {persona.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>
    </div>
  );
};

export { DetallePersona as VerPersona };
