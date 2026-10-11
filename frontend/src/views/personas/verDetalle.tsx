import React, { useEffect, useState } from "react";
import type { Persona } from "./tipos";
import { apiFetch } from "../../api/client";
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
    if (!personaLegajo) {
      setErrorCarga("No se especificó la persona.");
      setLoading(false);
      return;
    }

    apiFetch(`/personal/${personaLegajo}`, {
      headers: { "Accept": "application/json" }
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo obtener la información de la persona.");
        return res.json();
      })
      .then((data: Persona) => {
        setPersona(data);
        setErrorCarga(null);
      })
      .catch((err) => {
        console.error("Error en verDetalle:", err);
        setErrorCarga("Error al conectar con el servidor.");
      })
      .finally(() => setLoading(false));
  }, [personaLegajo]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de la Persona</h1>
        <div className="subtitulo">04 · Consulta</div>
      </div>

      {loading ? (
        <p>Cargando detalles de la persona...</p>
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
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: persona.activo ? "#dcfce7" : "#fee2e2",
                color: persona.activo ? "#166534" : "#991b1b",
              }}
            >
              {persona.activo ? "Activo" : "Inactivo"}
            </span>
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
