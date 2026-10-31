import React, { useEffect, useState } from "react";
import type { ProductoConId } from "./tipos";
import "../../styles/formularioAlta.css";
import { ConfirmAlertDialog, ErrorAlertDialog } from "../../components/ui/alert-dialog";
import { ConfirmExportDialog } from "../../components/ui/confirmExportDialog";
import { CsvIcon } from "../../components/icons/CsvIcon";
import { Paginacion} from "../../components/ui/paginacion";
import { usePaginacion } from "../../components/ui/usePaginacion"; 
import { apiFetch } from "../../api/client";
import { descargarCSV } from "../../utils/exportarCsv"; 

interface ListadoProductosProps {
  onNuevoClick?: () => void;
  onDetalleClick?: (id: number) => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoProductos: React.FC<ListadoProductosProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [productos, setProductos] = useState<ProductoConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const [productoAConfirmar, setProductoAConfirmar] = useState<ProductoConId | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchProductos = async () => {
      try {
        const res = await apiFetch(`/productos/`);
        if (!cancelado) {
          if (res.ok) {
            const data = await res.json();
            setProductos(data);
          } else {
            setProductos([]);
          }
        }
      } catch {
        if (!cancelado) setProductos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchProductos();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirConfirmacion = (prod: ProductoConId) => {
    setProductoAConfirmar(prod);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!productoAConfirmar) return;
    const esActivo = productoAConfirmar.activo;
    const accion = esActivo ? "dar de baja" : "restaurar";
    try {
      const url = esActivo
        ? `/productos/${productoAConfirmar.id}`
        : `/productos/${productoAConfirmar.id}/restaurar`;
      const method = esActivo ? "DELETE" : "POST";
      const res = await apiFetch(url, { method });

      if (res.ok) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === productoAConfirmar.id ? { ...p, activo: !esActivo } : p
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || `No se pudo ${accion} el producto.`);
      }
    } catch {
      setErrorDialogMsg(`Error de conexión al ${accion} el producto.`);
    } finally {
      setDialogAbierto(false);
      setProductoAConfirmar(null);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      p.nombre.toLowerCase().includes(term) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(term)) ||
      (p.nombre_receta && p.nombre_receta.toLowerCase().includes(term));

    const matchEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "activo" && p.activo) ||
      (filtroEstado === "inactivo" && !p.activo);

    return matchBusqueda && matchEstado;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (filtroEstado === "activo") {
        params.append("activo", "true");
      } else if (filtroEstado === "inactivo") {
        params.append("activo", "false");
      }

      if (busqueda.trim()) {
        params.append("busqueda", busqueda.trim());
      }

      const queryString = params.toString();
      const url = `/productos/exportar-csv${queryString ? `?${queryString}` : ""}`;

      await descargarCSV(url, "productos_elaborados.csv");
      setDialogExportarAbierto(false);
    } catch (error) {
      setErrorDialogMsg(
        error instanceof Error ? error.message : "Error al exportar los productos a CSV."
      );
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda}"`);
    if (filtroEstado !== "TODOS") partes.push(`Estado: ${filtroEstado}`);
    return partes.length > 0 ? partes.join(" | ") : "Sin filtros aplicados";
  };

  const {
    itemsPaginados: productosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(productosFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Productos Elaborados</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <CsvIcon /> Exportar CSV
          </button>

          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Registrar Producto
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, descripción o receta..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Unidad de Medida</th>
              <th>Receta Asociada</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando productos...
                </td>
              </tr>
            ) : productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  {busqueda || filtroEstado !== "TODOS"
                    ? "No se encontraron productos que coincidan con los filtros."
                    : "No hay productos registrados."}
                </td>
              </tr>
            ) : (
              productosPaginados.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                  <td>{i.unidadMedida}</td>
                  <td>{i.nombre_receta || "Sin receta"}</td>
                  <td>
                    <span className={`badge-status ${i.activo ? "activo" : "inactivo"}`}>
                      {i.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick?.(i.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(i.id)}
                      >
                        ✎
                      </button>
                      <button
                        className={`btn-icon ${i.activo ? "btn-eliminar" : "btn-reactivar"}`}
                        title={i.activo ? "Dar de baja" : "Restaurar"}
                        onClick={() => abrirConfirmacion(i)}
                      >
                        {i.activo ? "🗑" : "🔄"}
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
        etiqueta="productos"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={productosFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={productoAConfirmar?.activo ? "¿Dar de baja producto?" : "¿Restaurar producto?"}
        description={
          productoAConfirmar?.activo
            ? `¿Estás seguro de que deseas dar de baja el producto "${productoAConfirmar?.nombre}"?`
            : `¿Estás seguro de que deseas restaurar el producto "${productoAConfirmar?.nombre}"?`
        }
        confirmText={productoAConfirmar?.activo ? "Confirmar Baja" : "Confirmar Restauración"}
        cancelText="Cancelar"
        isDestructive={productoAConfirmar?.activo}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setProductoAConfirmar(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ""}
        onClose={() => setErrorDialogMsg(null)}
      />
    </div>
  );
};