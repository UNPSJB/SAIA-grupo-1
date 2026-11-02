import React, { useEffect, useState } from "react";
import type { DocumentoListItem, TipoDocumento } from "./tipos";
import { ModalHistorialVersiones } from "./modalHistorial";
import { DetalleDocumento } from "./verDetalle";
import { Paginacion } from "../../components/ui/paginacion";
import { usePaginacion } from "../../components/ui/usePaginacion";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import "../../styles/formularioAlta.css";
import "./documentos.css";

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
  const { esAdministrador } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalleIdInterno, setDetalleIdInterno] = useState<number | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [docHistorialSeleccionado, setDocHistorialSeleccionado] = useState<DocumentoListItem | null>(null);

  const handleDescargar = async (versionId?: number | null, nombreArchivo?: string | null) => {
    if (!versionId) return;
    try {
      const res = await apiFetch(`/documentos/archivo/${versionId}`);
      if (!res.ok) {
        throw new Error("No se pudo descargar el archivo.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo || "documento.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Error al descargar el archivo.");
    }
  };

  useEffect(() => {
    let cancelado = false;
    const cargarDatos = async () => {
      try {
        const resDocs = await apiFetch("/documentos");
        if (!cancelado && resDocs.ok) {
          const dataDocs = await resDocs.json();
          setDocumentos(dataDocs);
        } else if (!cancelado) {
          setDocumentos([]);
        }
      } catch {
        if (!cancelado) setDocumentos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarDatos();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirHistorial = (doc: DocumentoListItem) => {
    setDocHistorialSeleccionado(doc);
    setModalHistorialAbierto(true);
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

  const {
    itemsPaginados: documentosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(documentosFiltrados);

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
          <div className="subtitulo">
            {esAdministrador ? "01 · Listado de Documentos Vigentes" : "01 · Consulta de Documentos Vigentes"}
          </div>
        </div>
        {esAdministrador && onNuevoClick && (
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
              <th>Versión Vigente</th>
              <th>Entrada en Vigencia</th>
              <th>Vencimiento</th>
              <th>Peso</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando documentos...
                </td>
              </tr>
            ) : documentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  {busqueda || filtroTipo !== "TODOS"
                    ? "No se encontraron documentos que coincidan con los filtros."
                    : "No hay documentos registrados."}
                </td>
              </tr>
            ) : (
              documentosPaginados.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>{doc.titulo}</td>
                  <td>{getTipoLabel(doc.tipo)}</td>
                  <td>
                    {doc.es_vigente ? (
                      <span style={{
                        fontWeight: 600,
                        color: "var(--color-exito-texto)",
                        backgroundColor: "var(--color-exito-bg)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}>
                        v{doc.version_actual ?? 1}
                      </span>
                    ) : (
                      <span style={{
                        fontWeight: 600,
                        color: "var(--color-peligro-texto, #991b1b)",
                        backgroundColor: "var(--color-peligro-bg, #fee2e2)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}>
                        Sin versión vigente
                      </span>
                    )}
                  </td>
                  <td>{formatearFecha(doc.fecha_vigencia)}</td>
                  <td>{formatearFecha(doc.fecha_vencimiento)}</td>
                  <td style={{ color: "var(--color-texto-sec)", fontSize: "0.85rem" }}>
                    {doc.tamanio_formateado || (doc.tamanio_bytes ? `${(doc.tamanio_bytes / 1024).toFixed(1)} KB` : "—")}
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles del documento"
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
                      {doc.version_actual_id && (
                        <button
                          type="button"
                          className="btn-icon btn-descargar"
                          title="Descargar versión"
                          onClick={() => handleDescargar(doc.version_actual_id, doc.archivo_nombre_original)}
                        >
                          ⬇
                        </button>
                      )}
                      {esAdministrador && onNuevaVersionClick && (
                        <button
                          type="button"
                          className="btn-icon btn-subir-version"
                          title="Subir nueva versión"
                          onClick={() => onNuevaVersionClick(doc.id)}
                        >
                          ⬆
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-icon btn-historial"
                        title="Ver historial de versiones"
                        onClick={() => abrirHistorial(doc)}
                      >
                        ↺
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="documentos"
      />

      <ModalHistorialVersiones
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        documentoId={docHistorialSeleccionado?.id ?? null}
        documentoTitulo={docHistorialSeleccionado?.titulo}
      />
    </div>
  );
};
