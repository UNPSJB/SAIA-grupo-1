import React, { useEffect, useState } from "react";
import type { DocumentoListItem, PersonalAdmin, TipoDocumento } from "./tipos";
import { ModalSubir } from "./modalSubir";
import "./documentos.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const formatearFecha = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

const getTipoLabel = (tipo: TipoDocumento) => {
  switch (tipo) {
    case "MANUAL_BPM":
      return "Manual de BPM";
    case "FICHA_TECNICA":
      return "Ficha Técnica";
    case "PROCEDIMIENTO":
      return "Procedimiento";
    case "RECETA":
      return "Receta";
    default:
      return tipo;
  }
};

export const ListadoDocumentos: React.FC = () => {
  const [documentos, setDocumentos] = useState<DocumentoListItem[]>([]);
  const [personalAdmin, setPersonalAdmin] = useState<PersonalAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [docPreseleccionado, setDocPreseleccionado] = useState<DocumentoListItem | null>(null);

  const cargarDatos = async () => {
    try {
      const resDocs = await fetch(`${API_URL}/documentos`);
      if (resDocs.ok) {
        const dataDocs = await resDocs.json();
        setDocumentos(dataDocs);
      }

      const resPersonal = await fetch(`${API_URL}/personal`);
      if (resPersonal.ok) {
        const dataPers = await resPersonal.json();
        const admins = dataPers.filter(
          (p: any) =>
            p.activo &&
            (p.capacidad === "ADMINISTRAR" || p.capacidad === "AMBAS")
        );
        setPersonalAdmin(admins);
      }
    } catch {
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalNuevo = () => {
    setDocPreseleccionado(null);
    setModalAbierto(true);
  };

  const abrirModalNuevaVersion = (doc: DocumentoListItem) => {
    setDocPreseleccionado(doc);
    setModalAbierto(true);
  };

  const documentosFiltrados = documentos.filter((d) => {
    const matchTipo = filtroTipo === "TODOS" || d.tipo === filtroTipo;
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      d.titulo.toLowerCase().includes(term) ||
      (d.descripcion && d.descripcion.toLowerCase().includes(term)) ||
      (d.responsable_nombre && d.responsable_nombre.toLowerCase().includes(term)) ||
      (d.version_actual && d.version_actual.toLowerCase().includes(term));
    return matchTipo && matchBusqueda;
  });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Documentos Versionados</h1>
          <div className="subtitulo">01 · Gestión de Archivos y Versiones</div>
        </div>
        <div className="top-bar-acciones">
          <button
            type="button"
            className="btn-guardar"
            onClick={abrirModalNuevo}
          >
            + Subir Documento
          </button>
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por título, versión, responsable o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="MANUAL_BPM">Manual de BPM</option>
          <option value="FICHA_TECNICA">Ficha Técnica</option>
          <option value="PROCEDIMIENTO">Procedimiento</option>
          <option value="RECETA">Receta</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Versión Actual</th>
              <th>Última Actualización</th>
              <th>Responsable</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando documentos versionados...
                </td>
              </tr>
            ) : documentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem" }}>
                  {busqueda || filtroTipo !== "TODOS"
                    ? "No se encontraron documentos con los filtros aplicados."
                    : "No hay documentos versionados registrados. Haz clic en '+ Subir Documento' para comenzar."}
                </td>
              </tr>
            ) : (
              documentosFiltrados.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {doc.titulo}
                    </div>
                    {doc.descripcion && (
                      <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                        {doc.descripcion}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge-tipo ${doc.tipo.toLowerCase()}`}>
                      {getTipoLabel(doc.tipo)}
                    </span>
                  </td>
                  <td>
                    <span className="badge-version">
                      v{doc.version_actual || "1.0"}
                    </span>
                    {doc.total_versiones > 1 && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "6px" }}>
                        ({doc.total_versiones} vers.)
                      </span>
                    )}
                  </td>
                  <td>{formatearFecha(doc.fecha_subida_actual || doc.creado_el)}</td>
                  <td>{doc.responsable_nombre || "-"}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      {doc.version_actual_id && (
                        <button
                          type="button"
                          className="btn-accion btn-ver"
                          title="Abrir o descargar el archivo PDF de la versión actual"
                          onClick={() =>
                            window.open(
                              `${API_URL}/documentos/archivo/${doc.version_actual_id}`,
                              "_blank"
                            )
                          }
                        >
                          📄 Ver PDF
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-accion btn-editar"
                        title="Subir una nueva versión para este documento (archiva la actual)"
                        onClick={() => abrirModalNuevaVersion(doc)}
                      >
                        + Nueva Versión
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalSubir
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSuccess={() => {
          cargarDatos();
        }}
        documentoPreseleccionado={docPreseleccionado}
        documentosExistentes={documentos}
        personalAdmin={personalAdmin}
      />
    </div>
  );
};
