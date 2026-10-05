import React, { useEffect, useState } from "react";
import type { DocumentoListItem, TipoDocumento } from "./tipos";
import { ModalMarcarVigente } from "./modalMarcarVigente";
import { DetalleDocumento } from "./verDetalle";
import "../../styles/formularioAlta.css";

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

interface ListadoDocumentosProps {
  onNuevoClick?: () => void;
  onNuevaVersionClick?: (id: number) => void;
  onDetalleClick?: (id: number) => void;
}

export const ListadoDocumentos: React.FC<ListadoDocumentosProps> = ({
  onNuevoClick,
  onNuevaVersionClick,
  onDetalleClick,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalleIdInterno, setDetalleIdInterno] = useState<number | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

  const [modalVigenteAbierto, setModalVigenteAbierto] = useState(false);
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoListItem | null>(null);

  const cargarDatos = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("saia_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const resDocs = await fetch(`${API_URL}/documentos`, { headers });
      if (resDocs.ok) {
        const dataDocs = await resDocs.json();
        setDocumentos(dataDocs);
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

  const abrirMarcarVigente = (doc: DocumentoListItem) => {
    setDocSeleccionado(doc);
    setModalVigenteAbierto(true);
  };

  const documentosFiltrados = documentos.filter((d) => {
    const matchTipo = filtroTipo === "TODOS" || d.tipo === filtroTipo;
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      d.titulo.toLowerCase().includes(term) ||
      (d.descripcion && d.descripcion.toLowerCase().includes(term)) ||
      (d.version_actual !== null && String(d.version_actual).includes(term));
    return matchTipo && matchBusqueda;
  });

  if (detalleIdInterno && !onDetalleClick) {
    return (
      <DetalleDocumento
        documentoId={detalleIdInterno}
        onVolver={() => setDetalleIdInterno(null)}
      />
    );
  }

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Documentos Versionados</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>
        {onNuevoClick && (
          <button
            type="button"
            className="btn-guardar"
            onClick={onNuevoClick}
          >
            + Subir Documento
          </button>
        )}
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar documento por título o descripción..."
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
              <th>Título</th>
              <th>Tipo</th>
              <th>Versión</th>
              <th>Entrada en Vigencia</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando documentos...
                </td>
              </tr>
            ) : documentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  {busqueda || filtroTipo !== "TODOS"
                    ? "No se encontraron documentos que coincidan con los filtros."
                    : "No hay documentos registrados."}
                </td>
              </tr>
            ) : (
              documentosFiltrados.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>{doc.titulo}</td>
                  <td>{getTipoLabel(doc.tipo)}</td>
                  <td>{doc.version_actual ?? 1}</td>
                  <td>{formatearFecha(doc.fecha_vigencia)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => {
                          if (onDetalleClick) {
                            onDetalleClick(doc.id);
                          } else {
                            setDetalleIdInterno(doc.id);
                          }
                        }}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-subir-version"
                        title="Subir nueva versión"
                        onClick={() => onNuevaVersionClick?.(doc.id)}
                      >
                        ⬆
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-vigente"
                        title="Marcar versión vigente"
                        onClick={() => abrirMarcarVigente(doc)}
                      >
                        ✓
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalMarcarVigente
        isOpen={modalVigenteAbierto}
        onClose={() => setModalVigenteAbierto(false)}
        onSuccess={() => {
          cargarDatos();
        }}
        documento={docSeleccionado}
      />
    </div>
  );
};
