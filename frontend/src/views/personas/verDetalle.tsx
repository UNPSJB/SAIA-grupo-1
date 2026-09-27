import React, { useEffect, useState } from "react";
import type { Persona } from "./tipos";

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

    const url = `http://127.0.0.1:8000/personal/${personaLegajo}`;

    fetch(url, {
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

  const labelStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: "6px",
  };

  const valorBoxStyle: React.CSSProperties = {
    padding: "14px 16px",
    backgroundColor: "#1c1c26",
    borderRadius: "8px",
    fontSize: "15px",
    color: "#ffffff",
    border: "1px solid #2d2d3a",
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 60px", backgroundColor: "#13131a", minHeight: "100vh", color: "#9ca3af", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Cargando detalles de la persona...
      </div>
    );
  }

  if (errorCarga || !persona) {
    return (
      <div style={{ padding: "40px 60px", backgroundColor: "#13131a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: "540px", backgroundColor: "#3f1417", border: "1px solid #f87171", color: "#fca5a5", padding: "14px 18px", borderRadius: "8px", marginBottom: "20px" }}>
          ⚠️ {errorCarga || "Persona no encontrada."}
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: "12px 24px",
            backgroundColor: "#252533",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 60px", backgroundColor: "#13131a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 6px 0", color: "#ffffff", letterSpacing: "-0.5px" }}>
          Detalle de la Persona
        </h1>
        <span style={{ fontSize: "15px", color: "#9ca3af" }}>
          04 · Consulta
        </span>
      </div>

      <div style={{ maxWidth: "540px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <div style={labelStyle}>Legajo</div>
          <div style={valorBoxStyle}>{persona.legajo}</div>
        </div>

        <div>
          <div style={labelStyle}>Apellido y Nombre</div>
          <div style={valorBoxStyle}>{`${persona.apellido}, ${persona.nombre}`}</div>
        </div>

        <div>
          <div style={labelStyle}>DNI / Documento</div>
          <div style={valorBoxStyle}>{persona.documento ?? persona.dni}</div>
        </div>

        <div>
          <div style={labelStyle}>Correo electrónico</div>
          <div style={valorBoxStyle}>{persona.email}</div>
        </div>

        <div>
          <div style={labelStyle}>Capacidad</div>
          <div style={valorBoxStyle}>{persona.capacidad || "-"}</div>
        </div>

        <div>
          <div style={labelStyle}>Estado</div>
          <div style={{ ...valorBoxStyle, display: "flex", alignItems: "center" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: persona.activo ? "#143322" : "#3b171a",
                color: persona.activo ? "#4ade80" : "#f87171",
              }}
            >
              {persona.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: "15px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "12px 28px",
              backgroundColor: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export { DetallePersona as VerPersona };