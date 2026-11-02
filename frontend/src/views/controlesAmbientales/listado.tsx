import React, { useEffect, useState } from "react";
import type { ControlAmbiental, TipoControlAmbiental } from "./tipos";
import { ModalHistorialVisitas } from "./historialVisitas";
import { ModalRegistrarVisita } from "./registrarVisita";
import { DetalleControlAmbiental } from "./verDetalle";
import { EditarControlAmbiental } from "./editarDetalle";
import { Paginacion } from "../../components/ui/paginacion";
import { usePaginacion } from "../../components/ui/usePaginacion";
import { Badge } from "../../components/ui/badge";
import { ConfirmAlertDialog, ErrorAlertDialog } from "../../components/ui/alert-dialog";
import { ConfirmExportDialog } from "../../components/ui/confirmExportDialog";
import { CsvIcon } from "../../components/icons/CsvIcon";
import { apiFetch } from "../../api/client";
import { descargarCSV } from "../../utils/exportarCsv";
import { useAuth } from "../../auth/useAuth";
import "../../styles/formularioAlta.css";

const formatearFecha = (dateStr?: string | null) => {
  if (!dateStr) return "Sin fecha";
  try {
    const soloFecha = dateStr.split("T")[0];
    const partes = soloFecha.split("-");
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getTipoLabel = (tipo?: TipoControlAmbiental | null): string => {
  if (!tipo) return "—";
  switch (tipo) {
    case "CONTROL_PLAGAS":
      return "Control de Plagas";
    case "ANALISIS_AGUA":
      return "Análisis de Agua";
    case "LIMPIEZA_TANQUE":
      return "Limpieza de Tanque";
    default:
      return tipo;
  }
};

type EstadoVencimiento = "vencido" | "proximo" | "al_dia" | "sin_fecha";

interface ListadoControlesProps {
  onNuevoClick?: () => void;
  onDetalleClick?: (id: number) => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoControlesAmbientales: React.FC<ListadoControlesProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const { esAdministrador } = useAuth();
  const [controles, setControles] = useState<ControlAmbiental[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  // Navegación / Modales internos
  const [detalleIdInterno, setDetalleIdInterno] = useState<number | null>(null);
  const [editarIdInterno, setEditarIdInterno] = useState<number | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroActivo, setFiltroActivo] = useState<string>("TODOS");
  const [filtroVencimiento, setFiltroVencimiento] = useState<string>("TODOS");

  // Modales de Visita e Historial
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);
  const [controlSeleccionado, setControlSeleccionado] = useState<ControlAmbiental | null>(null);

  // Diálogo de Baja / Reactivación
  const [dialogToggleOpen, setDialogToggleOpen] = useState(false);
  const [controlAToggle, setControlAToggle] = useState<ControlAmbiental | null>(null);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const fetchControles = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filtroActivo !== "TODOS") params.append("filtro_activo", filtroActivo);
        if (busqueda.trim()) params.append("busqueda", busqueda.trim());

        const queryString = params.toString();
        const res = await apiFetch(`/controles-ambientales${queryString ? `?${queryString}` : ""}`);

        if (!cancelado && res.ok) {
          const data: ControlAmbiental[] = await res.json();
          setControles(data);
        } else if (!cancelado) {
          setControles([]);
        }
      } catch {
        if (!cancelado) setControles([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchControles();
    return () => {
      cancelado = true;
    };
  }, [busqueda, filtroActivo, refreshKey]);

  const calcularEstadoVencimiento = (fechaVencStr?: string | null): EstadoVencimiento => {
    if (!fechaVencStr) return "sin_fecha";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fLim = new Date(fechaVencStr);
    fLim.setHours(0, 0, 0, 0);

    const diffTiempo = fLim.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return "vencido";
    if (diffDias <= 15) return "proximo";
    return "al_dia";
  };

  const abrirConfirmacionToggle = (control: ControlAmbiental) => {
    setControlAToggle(control);
    setDialogToggleOpen(true);
  };

  const ejecutarToggle = async () => {
    if (!controlAToggle) return;
    const accion = controlAToggle.activo ? "dar de baja" : "reactivar";
    try {
      const url = controlAToggle.activo
        ? `/controles-ambientales/${controlAToggle.id}`
        : `/controles-ambientales/${controlAToggle.id}/reactivar`;
      const method = controlAToggle.activo ? "DELETE" : "PATCH";

      const res = await apiFetch(url, { method });

      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || `No se pudo ${accion} el control ambiental.`);
      }
    } catch {
      setErrorDialogMsg(`Error de conexión al ${accion} el control ambiental.`);
    } finally {
      setDialogToggleOpen(false);
      setControlAToggle(null);
    }
  };

  const controlesFiltrados = controles.filter((c) => {
    const matchTipo = filtroTipo === "TODOS" || c.tipo === filtroTipo;
    const estadoVenc = calcularEstadoVencimiento(c.fecha_vencimiento);
    const matchVencimiento =
      filtroVencimiento === "TODOS" ||
      (filtroVencimiento === "VENCIDOS" && estadoVenc === "vencido") ||
      (filtroVencimiento === "PROXIMOS" && estadoVenc === "proximo") ||
      (filtroVencimiento === "AL_DIA" && estadoVenc === "al_dia");

    return matchTipo && matchVencimiento;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (busqueda.trim()) {
        params.append("busqueda", busqueda.trim());
      }
      
      if (filtroTipo !== "TODOS") {
        params.append("tipo", filtroTipo);
      }

      if (filtroActivo !== "TODOS") {
        params.append("filtro_activo", filtroActivo);
      }

      if (filtroVencimiento !== "TODOS") {
        params.append("filtro_estado", filtroVencimiento);
      }

      const queryString = params.toString();
      const url = `/controles-ambientales/exportar-csv${queryString ? `?${queryString}` : ""}`;

      await descargarCSV(url, "controles_ambientales.csv");
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(err instanceof Error ? err.message : "Error al exportar controles a CSV.");
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda.trim()}"`);
    if (filtroTipo !== "TODOS") partes.push(`Tipo: ${getTipoLabel(filtroTipo as TipoControlAmbiental)}`);
    if (filtroActivo !== "TODOS") partes.push(`Estado registro: ${filtroActivo === "ACTIVOS" ? "Solo Activos" : "Solo Inactivos"}`);
    if (filtroVencimiento !== "TODOS") {
      const vencMap: Record<string, string> = {
        VENCIDOS: "Vencidos",
        PROXIMOS: "Próximos a vencer",
        AL_DIA: "Al día",
      };
      partes.push(`Vencimiento: ${vencMap[filtroVencimiento] || filtroVencimiento}`);
    }
    return partes.length > 0 ? partes.join(" | ") : "Sin filtros aplicados";
  };

  const {
    itemsPaginados: controlesPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(controlesFiltrados);

  if (detalleIdInterno && !onDetalleClick) {
    return (
      <DetalleControlAmbiental
        controlId={detalleIdInterno}
        onVolver={() => setDetalleIdInterno(null)}
      />
    );
  }

  if (editarIdInterno && !onEditarClick) {
    return (
      <EditarControlAmbiental
        controlId={editarIdInterno}
        onSuccess={() => {
          setEditarIdInterno(null);
          setRefreshKey((k) => k + 1);
        }}
        onCancel={() => setEditarIdInterno(null)}
      />
    );
  }

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Controles Ambientales y Sanitarios</h1>
          <div className="subtitulo">
            01 · Control de Plagas, Análisis de Agua y Limpieza de Tanque
          </div>
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

          {esAdministrador && onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Registrar Tipo de Control
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por tipo u observaciones..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="CONTROL_PLAGAS">Control de Plagas</option>
          <option value="ANALISIS_AGUA">Análisis de Agua</option>
          <option value="LIMPIEZA_TANQUE">Limpieza de Tanque</option>
        </select>

        <select
          className="select-filtro"
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVOS">Activos</option>
          <option value="INACTIVOS">Inactivos</option>
        </select>

        <select
          className="select-filtro"
          value={filtroVencimiento}
          onChange={(e) => setFiltroVencimiento(e.target.value)}
        >
          <option value="TODOS">Todos los vencimientos</option>
          <option value="VENCIDOS">Vencidos</option>
          <option value="PROXIMOS">Próximos a vencer</option>
          <option value="AL_DIA">Al día</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo de Control</th>
              <th>Periodicidad</th>
              <th>Última Realización</th>
              <th>Próximo Control</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  Cargando controles ambientales...
                </td>
              </tr>
            ) : controlesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  No se encontraron controles ambientales.
                </td>
              </tr>
            ) : (
              controlesPaginados.map((item) => {
                const estadoVenc = calcularEstadoVencimiento(item.fecha_vencimiento);
                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td style={{ fontWeight: 500 }}>{getTipoLabel(item.tipo)}</td>
                    <td>{item.periodicidad_dias} días</td>
                    <td>{formatearFecha(item.ultima_fecha_realizacion)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span>{item.activo ? formatearFecha(item.fecha_vencimiento) : "Sin fecha"}</span>

                        {item.activo && estadoVenc === "vencido" && (
                          <Badge variant="vencido" title="El control se encuentra vencido">
                            ● Vencido
                          </Badge>
                        )}

                        {item.activo && estadoVenc === "proximo" && (
                          <Badge variant="proximo" title="Quedan 15 días o menos para el próximo control">
                            ▲ Próximo a vencer
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge variant={item.activo ? "activo" : "inactivo"}>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        {/* 1. REGISTRAR NUEVA VISITA (flecha de reseteo ↻, sólo si está activo) */}
                        {esAdministrador && item.activo && (
                          <button
                            type="button"
                            className="btn-icon btn-reactivar"
                            title="Registrar nueva visita"
                            onClick={() => {
                              setControlSeleccionado(item);
                              setModalVisitaAbierto(true);
                            }}
                          >
                            ↻
                          </button>
                        )}

                        {/* 2. VER DETALLES (ojo 👁) */}
                        <button
                          type="button"
                          className="btn-icon btn-ver"
                          title="Ver detalles"
                          onClick={() => {
                            if (onDetalleClick) onDetalleClick(item.id);
                            else setDetalleIdInterno(item.id);
                          }}
                        >
                          👁
                        </button>

                        {/* 3. EDITAR (lápiz limpio ✎) */}
                        {esAdministrador && (
                          <button
                            type="button"
                            className="btn-icon btn-editar"
                            title="Editar"
                            onClick={() => {
                              if (onEditarClick) onEditarClick(item.id);
                              else setEditarIdInterno(item.id);
                            }}
                          >
                            ✎
                          </button>
                        )}

                        {/* 4. DAR DE BAJA / REACTIVAR (tacho 🗑 o reciclaje 🔄) */}
                        {esAdministrador && (
                          <button
                            type="button"
                            className={`btn-icon ${item.activo ? "btn-eliminar" : "btn-reactivar"}`}
                            title={item.activo ? "Dar de baja" : "Reactivar"}
                            onClick={() => abrirConfirmacionToggle(item)}
                          >
                            {item.activo ? "🗑" : "🔄"}
                          </button>
                        )}

                        {/* 5. HISTORIAL DE VISITAS (flecha ↺) */}
                        <button
                          type="button"
                          className="btn-icon btn-historial"
                          title="Ver historial de visitas"
                          onClick={() => {
                            setControlSeleccionado(item);
                            setModalHistorialAbierto(true);
                          }}
                        >
                          ↺
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

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="controles"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={controlesFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogToggleOpen}
        title={controlAToggle?.activo ? "¿Dar de baja control ambiental?" : "¿Reactivar control ambiental?"}
        description={
          controlAToggle?.activo
            ? `¿Estás seguro de que deseas dar de baja el control de "${getTipoLabel(controlAToggle?.tipo)}"?`
            : `¿Estás seguro de que deseas reactivar el control de "${getTipoLabel(controlAToggle?.tipo)}"?`
        }
        confirmText={controlAToggle?.activo ? "Confirmar Baja" : "Confirmar Reactivación"}
        cancelText="Cancelar"
        isDestructive={Boolean(controlAToggle?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogToggleOpen(false);
          setControlAToggle(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ""}
        onClose={() => setErrorDialogMsg(null)}
      />

      {controlSeleccionado && (
        <ModalRegistrarVisita
          isOpen={modalVisitaAbierto}
          onClose={() => setModalVisitaAbierto(false)}
          control={controlSeleccionado}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {controlSeleccionado && (
        <ModalHistorialVisitas
          isOpen={modalHistorialAbierto}
          onClose={() => setModalHistorialAbierto(false)}
          controlId={controlSeleccionado.id}
          tipoLabel={getTipoLabel(controlSeleccionado.tipo)}
        />
      )}
    </div>
  );
};