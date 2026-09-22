import React, { useState, useEffect } from "react";
import type { Persona } from "./tipos";

export interface ListadoPersonasProps {
  onNuevoClick: () => void;
  onDetalleClick: (legajo: number) => void;
  onEditarClick: (legajo: number) => void;
}

export const ListadoPersonas: React.FC<ListadoPersonasProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCapacidad, setFiltroCapacidad] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  const cargarPersonas = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/personal/", {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPersonas(data);
      }
    } catch (e) {
      console.error("Error al cargar personas:", e);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, []);

  const handleToggleActivo = async (legajo: number, estadoActual: boolean) => {
    const accion = estadoActual ? "dar de baja" : "reactivar";
    if (!window.confirm(`¿Seguro que desea ${accion} a esta persona?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/personal/${legajo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ activo: !estadoActual }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error al ${accion} la persona`);
      }
      cargarPersonas();
    } catch (err: any) {
      alert(err.message || `Error al ${accion} la persona.`);
    }
  };

  const personasFiltradas = personas.filter((p) => {
    const term = searchTerm.toLowerCase();
    const docStr = String(p.documento ?? p.dni ?? "");
    const nombreCompleto = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();

    const matchBusqueda =
      nombreCompleto.includes(term) ||
      (p.nombre && p.nombre.toLowerCase().includes(term)) ||
      (p.apellido && p.apellido.toLowerCase().includes(term)) ||
      docStr.includes(term) ||
      (p.email && p.email.toLowerCase().includes(term));

    const matchCapacidad =
      filtroCapacidad === "TODOS" || p.capacidad === filtroCapacidad;

    const matchEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "ACTIVO" ? p.activo : !p.activo);

    return matchBusqueda && matchCapacidad && matchEstado;
  });

  return (
    <div style={{ padding: "40px 60px", backgroundColor: "#13131a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 6px 0", color: "#ffffff", letterSpacing: "-0.5px" }}>
            Lista de Personas
          </h1>
          <span style={{ fontSize: "15px", color: "#9ca3af" }}>
            01 · Listado
          </span>
        </div>

        <button
          onClick={onNuevoClick}
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontWeight: "600",
            fontSize: "15px",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Agregar Persona
        </button>
      </div>

      {/* Filtros con capacidades corregidas */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "25px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar por DNI, Nombre o Apellido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px 16px",
            border: "1px solid #2d2d3a",
            borderRadius: "8px",
            backgroundColor: "#1c1c26",
            fontSize: "14px",
            minWidth: "280px",
            color: "#ffffff",
            outline: "none",
          }}
        />

        <select
          value={filtroCapacidad}
          onChange={(e) => setFiltroCapacidad(e.target.value)}
          style={{
            padding: "10px 16px",
            border: "1px solid #2d2d3a",
            borderRadius: "8px",
            backgroundColor: "#1c1c26",
            fontSize: "14px",
            color: "#ffffff",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="TODOS">Todas las capacidades</option>
          <option value="OPERAR">OPERAR</option>
          <option value="MANTENIMIENTO">MANTENIMIENTO</option>
          <option value="AMBAS">AMBAS</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: "10px 16px",
            border: "1px solid #2d2d3a",
            borderRadius: "8px",
            backgroundColor: "#1c1c26",
            fontSize: "14px",
            color: "#ffffff",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e1e28", color: "#e5e7eb", fontSize: "15px", fontWeight: "bold" }}>
              <th style={{ padding: "16px 20px", borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px" }}>DNI</th>
              <th style={{ padding: "16px 20px" }}>Nombre</th>
              <th style={{ padding: "16px 20px" }}>Apellido</th>
              <th style={{ padding: "16px 20px" }}>Correo</th>
              <th style={{ padding: "16px 20px" }}>Capacidad</th>
              <th style={{ padding: "16px 20px" }}>Estado</th>
              <th style={{ padding: "16px 20px", textAlign: "center", borderTopRightRadius: "10px", borderBottomRightRadius: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personasFiltradas.length > 0 ? (
              personasFiltradas.map((p) => {
                const identificador = p.legajo ?? (p as any).id;
                return (
                  <tr
                    key={identificador}
                    style={{
                      backgroundColor: "#181822",
                      color: "#d1d5db",
                      fontSize: "14px",
                    }}
                  >
                    <td style={{ padding: "16px 20px", fontWeight: "500", color: "#ffffff" }}>
                      {p.documento ?? p.dni}
                    </td>
                    <td style={{ padding: "16px 20px" }}>{p.nombre}</td>
                    <td style={{ padding: "16px 20px" }}>{p.apellido}</td>
                    <td style={{ padding: "16px 20px" }}>{p.email}</td>
                    <td style={{ padding: "16px 20px" }}>{p.capacidad || "-"}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: p.activo ? "#143322" : "#3b171a",
                          color: p.activo ? "#4ade80" : "#f87171",
                        }}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => onDetalleClick(identificador)}
                          title="Ver detalle"
                          style={{
                            backgroundColor: "#252533",
                            border: "none",
                            borderRadius: "50%",
                            width: "34px",
                            height: "34px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => onEditarClick(identificador)}
                          title="Editar"
                          style={{
                            backgroundColor: "#252533",
                            border: "none",
                            borderRadius: "50%",
                            width: "34px",
                            height: "34px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleToggleActivo(identificador, p.activo)}
                          title={p.activo ? "Dar de baja" : "Reactivar"}
                          style={{
                            backgroundColor: "#252533",
                            border: "none",
                            borderRadius: "50%",
                            width: "34px",
                            height: "34px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          {p.activo ? "🗑️" : "🔄"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "15px" }}>
                  No se encontraron personas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};