import React, { useState, useEffect } from "react";
import type { Persona } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from "../../components/ui/alert-dialog";
import { apiFetch } from '../../api/client';

export interface ListadoPersonasProps {
  onNuevoClick: () => void;
  onDetalleClick: (legajo: number) => void;
  onEditarClick: (legajo: number) => void;
  onVerCertificados: (legajo: number, nombreCompleto: string) => void;
}

export const ListadoPersonas: React.FC<ListadoPersonasProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
  onVerCertificados,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCapacidad, setFiltroCapacidad] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  const [personaAConfirmar, setPersonaAConfirmar] = useState<Persona | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);

  const cargarPersonas = async () => {
    try {
      const res = await apiFetch("/personal/", {
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

  const abrirConfirmacion = (p: Persona) => {
    setPersonaAConfirmar(p);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!personaAConfirmar) return;
    const identificador = personaAConfirmar.legajo;
    const estadoActual = personaAConfirmar.activo;
    const accion = estadoActual ? "dar de baja" : "reactivar";

    try {
      const res = await apiFetch(`/personal/${identificador}`, {
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
    } finally {
      setDialogAbierto(false);
      setPersonaAConfirmar(null);
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
      (p.usuario && p.usuario.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term));

    const matchCapacidad =
      filtroCapacidad === "TODOS" || p.capacidad === filtroCapacidad;

    const matchEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "ACTIVO" ? p.activo : !p.activo);

    return matchBusqueda && matchCapacidad && matchEstado;
  });

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

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar por DNI, nombre o apellido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroCapacidad}
          onChange={(e) => setFiltroCapacidad(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todas las capacidades</option>
          <option value="OPERAR">Operar</option>
          <option value="ADMINISTRAR">Administrar</option>
          <option value="AMBAS">Operar y Administrar</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom tabla-personas">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Nombre Completo</th>
              <th>Usuario</th>
              <th>Correo Electrónico</th>
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
                  {searchTerm || filtroCapacidad !== "TODOS" || filtroEstado !== "TODOS"
                    ? "No se encontraron personas con los filtros seleccionados."
                    : "No hay personas registradas."}
                </td>
              </tr>
            ) : (
              personasFiltradas.map((p) => {
                const identificador = p.legajo;
                return (
                  <tr key={identificador}>
                    <td>{p.documento ?? p.dni}</td>
                    <td>{`${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()}</td>
                    <td>{p.usuario}</td>
                    <td className="col-correo">{p.email}</td>
                    <td>
                      {p.capacidad === "OPERAR"
                        ? "Operar"
                        : p.capacidad === "ADMINISTRAR"
                        ? "Administrar"
                        : p.capacidad === "AMBAS"
                        ? "Operar y Administrar"
                        : "-"}
                    </td>
                    <td>
                      <span className={`badge-status ${p.activo ? "activo" : "inactivo"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Ver certificados"
                          onClick={() => onVerCertificados(identificador, `${p.nombre} ${p.apellido}`)}
                        >
                          📜
                        </button>
                        <button
                          className="btn-icon btn-ver"
                          title="Ver detalle"
                          onClick={() => onDetalleClick(identificador)}
                        >
                          👁
                        </button>
                        <button
                          className="btn-icon btn-editar"
                          title="Editar"
                          onClick={() => onEditarClick(identificador)}
                        >
                          ✎
                        </button>
                        <button
                          className={`btn-icon ${p.activo ? "btn-eliminar" : "btn-reactivar"}`}
                          title={p.activo ? "Dar de baja" : "Reactivar"}
                          onClick={() => abrirConfirmacion(p)}
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

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={personaAConfirmar?.activo ? "¿Dar de baja persona?" : "¿Reactivar persona?"}
        description={
          personaAConfirmar?.activo
            ? `¿Seguro que deseas dar de baja a "${personaAConfirmar?.nombre} ${personaAConfirmar?.apellido}"?`
            : `¿Seguro que deseas reactivar a "${personaAConfirmar?.nombre} ${personaAConfirmar?.apellido}"?`
        }
        confirmText={personaAConfirmar?.activo ? "Dar de baja" : "Reactivar"}
        cancelText="Cancelar"
        isDestructive={Boolean(personaAConfirmar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setPersonaAConfirmar(null);
        }}
      />
    </div>
  );
};
