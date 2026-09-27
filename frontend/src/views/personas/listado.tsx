import React, { useState, useEffect } from "react";
import type { Persona } from "./tipos";
import '../../styles/formularioAlta.css';

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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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

  const campoFiltroStyle: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    backgroundColor: "var(--code-bg)",
    fontSize: "14px",
    color: "var(--text-h)",
    outline: "none",
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Personas</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <button onClick={onNuevoClick} className="btn-guardar">
          + Agregar Persona
        </button>
      </div>

      <div style={{ display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar por DNI, Nombre o Apellido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...campoFiltroStyle, minWidth: "280px" }}
        />

        <select
          value={filtroCapacidad}
          onChange={(e) => setFiltroCapacidad(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: "pointer" }}
        >
          <option value="TODOS">Todas las capacidades</option>
          <option value="OPERAR">Operar</option>
          <option value="ADMINISTRAR">Administrar</option>
          <option value="AMBAS">Operar y Administrar</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: "pointer" }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Capacidad</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando personas...
                </td>
              </tr>
            ) : personasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  No se encontraron personas registradas.
                </td>
              </tr>
            ) : (
              personasFiltradas.map((p) => {
                const identificador = p.legajo ?? (p as any).id;
                return (
                  <tr key={identificador}>
                    <td>{p.documento ?? p.dni}</td>
                    <td>{p.nombre}</td>
                    <td>{p.apellido}</td>
                    <td>{p.email}</td>
                    <td>{p.capacidad == "OPERAR"? "Operar"
                        : p.capacidad == "ADMINISTRAR"? "Administrar"
                        : p.capacidad == "AMBAS"? "Operar y Administrar"
                        : "-"}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: p.activo ? "#dcfce7" : "#fee2e2",
                          color: p.activo ? "#166534" : "#991b1b",
                        }}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button className="btn-icon" title="Ver detalle" onClick={() => onDetalleClick(identificador)}>
                          👁
                        </button>
                        <button className="btn-icon" title="Editar" onClick={() => onEditarClick(identificador)}>
                          ✎
                        </button>
                        <button
                          className="btn-icon"
                          title={p.activo ? "Dar de baja" : "Reactivar"}
                          onClick={() => handleToggleActivo(identificador, p.activo)}
                        >
                          {p.activo ? "🗑" : "🔄"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
