import { useEffect, useState } from "react";
import { formatearReglaUmbral, type RecetaConId, type RecetaDetalleConId } from "./tipos";
import "../../styles/formularioAlta.css";
import EditarDetalleReceta from "./editarEtapaReceta";
import NuevoDetalleReceta from "./crearEtapaReceta";
import { ConfirmAlertDialog, ErrorAlertDialog } from "../../components/ui/alert-dialog";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { apiFetch } from "../../api/client";
import { usePersonalActivo } from "../tareas/usePersonalActivo";

interface ProductoOption {
  id: number;
  nombre: string;
  unidadMedida?: string;
  unidad_medida_abreviatura?: string | null;
  cantidad_por_envase?: number | null;
  peso_unidad_g?: number | null;
  activo?: boolean;
}

const HOY = new Date().toISOString().split("T")[0];

const RECETA_INICIAL: RecetaConId = {
  id: 0,
  nombre: "",
  rendimiento_final: 0,
  id_producto: 0,
  operario_legajo: 0,
  activo: true,
  detalles: [],
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
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

const toInputDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

interface EditarRecetaProps {
  recetaID: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarReceta({ recetaID, onSuccess, onCancel }: EditarRecetaProps) {
  const [receta, setReceta] = useState<RecetaConId>(RECETA_INICIAL);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [detalles, setDetalles] = useState<RecetaDetalleConId[]>([]);
  const [fechaVigencia, setFechaVigencia] = useState<string>(HOY);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalAbierto, setModal] = useState(false);
  const [etapaParaModal, setEtapaParaModal] = useState<string>("");
  const [modalEditar, setModalEditar] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<RecetaDetalleConId | null>(null);
  const [detalleAConfirmar, setDetalleAConfirmar] = useState<RecetaDetalleConId | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);
  const personas = usePersonalActivo();

  useEffect(() => {
    let cancelado = false;
    const fetchProductos = async () => {
      try {
        const res = await apiFetch(`/productos/`);
        if (!cancelado && res.ok) {
          const data: ProductoOption[] = await res.json();
          setProductos(data.filter((p) => p.activo !== false));
        }
      } catch {
        if (!cancelado) setProductos([]);
      }
    };
    fetchProductos();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!recetaID) return;
    let cancelado = false;
    setLoading(true);

    const fetchReceta = async () => {
      try {
        const res = await apiFetch(`/recetas/${recetaID}`);
        if (!cancelado && res.ok) {
          const data: RecetaConId = await res.json();
          setReceta(data);
          const detallesCrudos = data.detalles ?? data.version_actual?.detalles ?? [];
          const detallesNormalizados = detallesCrudos.map((item) => ({
            ...item,
            etapa: item.etapa || "General",
            tipo_insumo_id: item.tipo_insumo_id ? Number(item.tipo_insumo_id) : null,
            parametros_control: item.parametros_control ?? [],
          }));
          setDetalles(detallesNormalizados);
          if (data.version_actual?.fecha_vigencia) {
            const vig = toInputDate(data.version_actual.fecha_vigencia);
            setFechaVigencia(vig < HOY ? HOY : vig);
          }
          if (data.version_actual?.fecha_vencimiento) {
            setFechaVencimiento(toInputDate(data.version_actual.fecha_vencimiento));
          }
        }
      } catch {
        if (!cancelado) setErrorDialogMsg("La Receta no existe.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchReceta();
    return () => {
      cancelado = true;
    };
  }, [recetaID]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name === "id_producto") {
      const prodSeleccionado = productos.find((p) => p.id === Number(value));
      setReceta((prev) => ({
        ...prev,
        id_producto: Number(value),
        nombre: prodSeleccionado ? prodSeleccionado.nombre : prev.nombre,
      }));
      return;
    }

    setReceta((prev) => ({ ...prev, [name]: value }));
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function nombreValido(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s.,;()\-_]+$/;
      return patron.test(nombre);
    }

    if (!receta.id_producto) {
      setErrorMsg("Debe seleccionar un producto asociado.");
      return;
    }

    if (!receta.nombre.trim()) {
      setErrorMsg("El nombre de la receta no puede estar vacío.");
      return;
    }

    if (receta.nombre.trim().length <= 1) {
      setErrorMsg("El nombre de la receta tiene que tener más de 1 carácter.");
      return;
    }

    if (!nombreValido(receta.nombre)) {
      setErrorMsg("No se permiten caracteres especiales inválidos en el nombre.");
      return;
    }

    if (!receta.operario_legajo) {
      setErrorMsg("Debe seleccionar un operario a cargo de la receta.");
      return;
    }

    if (!receta.rendimiento_final || Number(receta.rendimiento_final) <= 0) {
      setErrorMsg("El rendimiento final debe ser mayor a 0.");
      return;
    }

    if (detalles.length === 0) {
      setErrorMsg("Por favor agregue al menos una etapa / ingrediente a la receta.");
      return;
    }

    const tieneIngredienteBase = detalles.some((d) => Boolean(d.tipo_insumo_id) && !d.es_aditivo);
    if (!tieneIngredienteBase) {
      setErrorMsg("La receta debe tener al menos un ingrediente que no sea aditivo.");
      return;
    }

    if (fechaVigencia && fechaVencimiento && fechaVencimiento < fechaVigencia) {
      setErrorMsg("La fecha de vencimiento no puede ser anterior a la fecha de vigencia.");
      return;
    }

    const formatearFechaISO = (fechaStr: string) => {
      if (!fechaStr) return null;
      if (fechaStr === HOY) {
        return `${fechaStr}T23:59:59`;
      }
      return `${fechaStr}T00:00:00`;
    };

    const payload = {
      nombre: receta.nombre.trim(),
      rendimiento_final: Number(receta.rendimiento_final),
      id_producto: Number(receta.id_producto),
      operario_legajo: Number(receta.operario_legajo),
      fecha_vigencia: fechaVigencia ? formatearFechaISO(fechaVigencia) : null,
      fecha_vencimiento: fechaVencimiento ? formatearFechaISO(fechaVencimiento) : null,
      detalles: detalles.map((d) => {
        const idTipo = Number(d.tipo_insumo_id ?? 0);
        return {
          etapa: d.etapa?.trim() || "General",
          tipo_insumo_id: idTipo > 0 ? idTipo : null,
          nombre: d.nombre.trim(),
          cantidad: idTipo > 0 ? Number(d.cantidad) : 0,
          unidad_medida: d.unidad_medida?.trim() || "unidades",
          es_aditivo: idTipo > 0 ? Boolean(d.es_aditivo) : false,
          clase_funcional: d.es_aditivo ? d.clase_funcional : null,
          numero_ins: d.es_aditivo ? d.numero_ins : null,
          descripcion_pasos: d.descripcion_pasos.trim(),
          parametros_control: d.parametros_control ?? [],
        };
      }),
    };

    setLoading(true);

    try {
      const res = await apiFetch(`/recetas/${recetaID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar la receta.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Receta editada exitosamente (Nueva versión generada)");
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setReceta(RECETA_INICIAL);
    setDetalles([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  const abrirConfirmacion = (detalle: RecetaDetalleConId) => {
    setDetalleAConfirmar(detalle);
    setDialogAbierto(true);
  };

  const ejecutarBajaDetalle = () => {
    if (!detalleAConfirmar) return;
    setDetalles((prev) => prev.filter((d) => d.id !== detalleAConfirmar.id));
    setDialogAbierto(false);
    setDetalleAConfirmar(null);
  };

  return (
    <div className="modulo-container" style={{ maxWidth: "860px" }}>
      <div className="modulo-header">
        <h1>Editar Receta</h1>
        <div className="subtitulo">
          02 · Modificación (Versión actual: v{receta.version_actual?.version ?? 1})
        </div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="fecha_creacion">Fecha de Creación</label>
          <input
            id="fecha_creacion"
            type="text"
            value={formatDate(receta.fecha_creacion)}
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="id_producto">Producto Asociado</label>
          <select
            id="id_producto"
            name="id_producto"
            value={receta.id_producto ?? ""}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione un producto
            </option>
            {productos.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre} {prod.unidadMedida ? `(${prod.unidadMedida})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Receta</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={receta.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="operario_legajo">Operario a Cargo de la Receta</label>
          <select
            id="operario_legajo"
            name="operario_legajo"
            value={receta.operario_legajo ?? ""}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione un operador activo
            </option>
            {personas.map((p) => (
              <option key={p.legajo} value={p.legajo}>
                {p.apellido}, {p.nombre} (Legajo: {p.legajo})
              </option>
            ))}
          </select>
        </div>

        {(() => {
          const prodSel = productos.find((p) => p.id === Number(receta.id_producto));
          const uProd = prodSel?.unidadMedida || "";
          const cantEnv = prodSel?.cantidad_por_envase || null;
          const pesoEnv = prodSel?.peso_unidad_g || null;
          const rendNum = Number(receta.rendimiento_final) || 0;
          return (
            <div className="form-group">
              <label htmlFor="rendimiento_final">
                Rendimiento Final (cantidad de unidades / envases del producto)
              </label>
              <input
                id="rendimiento_final"
                name="rendimiento_final"
                type="number"
                step="any"
                min="0.01"
                placeholder="Ej: 5 unidades / envases que produce esta receta"
                value={receta.rendimiento_final}
                onChange={handleChange}
              />
              {prodSel && (cantEnv || pesoEnv) && (
                <div style={{ fontSize: "0.8rem", color: "var(--color-texto-sec)", marginTop: "4px" }}>
                  1 unidad/envase = {cantEnv ? `${cantEnv} ${uProd}` : ""}
                  {cantEnv && pesoEnv ? ` (${pesoEnv} g)` : pesoEnv ? `${pesoEnv} g` : ""}
                  {rendNum > 0 && cantEnv
                    ? ` · Esta receta produce ${Math.round(rendNum * cantEnv * 1000) / 1000} ${uProd}${
                        pesoEnv ? ` (${Math.round(rendNum * pesoEnv * 100) / 100} g)` : ""
                      }`
                    : ""}
                </div>
              )}
            </div>
          );
        })()}

        <div className="form-group">
          <label htmlFor="fecha_vigencia">Fecha de Vigencia (Nueva Versión)</label>
          <input
            id="fecha_vigencia"
            name="fecha_vigencia"
            type="date"
            min={HOY}
            value={fechaVigencia}
            onChange={(e) => setFechaVigencia(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fecha_vencimiento">Fecha de Vencimiento (Nueva Versión)</label>
          <input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
            min={fechaVigencia || HOY}
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </div>

        <div className="listado-top-bar" style={{ marginTop: "1.75rem", marginBottom: "0.75rem" }}>
          <div className="modulo-header">
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-texto)" }}>
              Etapas y Pasos de la Receta
            </h2>
          </div>
          <button
            type="button"
            className="btn-guardar"
            onClick={() => {
              setEtapaParaModal("");
              setModal(true);
            }}
          >
            + Agregar Paso
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Cargando Etapas...</div>
        ) : detalles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              border: "1px dashed var(--color-borde, #334155)",
              borderRadius: "8px",
              marginBottom: "1rem",
              color: "var(--color-texto-sec)",
            }}
          >
            No hay Etapas ni Pasos registrados.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
            {Array.from(new Set(detalles.map((d) => d.etapa || "General"))).map((nombreEtapa) => {
              const pasosEtapa = detalles.filter((d) => (d.etapa || "General") === nombreEtapa);
              return (
                <div
                  key={nombreEtapa}
                  style={{
                    border: "1px solid var(--color-borde, #334155)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "rgba(37, 99, 235, 0.08)",
                      borderBottom: "1px solid var(--color-borde, #334155)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>
                      Etapa: {nombreEtapa} ({pasosEtapa.length})
                    </div>
                    <button
                      type="button"
                      className="btn-cancelar"
                      style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                      onClick={() => {
                        setEtapaParaModal(nombreEtapa);
                        setModal(true);
                      }}
                    >
                      + Paso en {nombreEtapa}
                    </button>
                  </div>
                  <div className="tabla-wrapper" style={{ margin: 0, border: "none", borderRadius: 0 }}>
                    <table className="tabla-custom tabla-insumos">
                      <thead>
                        <tr>
                          <th>Paso</th>
                          <th>Ingrediente / Aditivo</th>
                          <th>Cantidad</th>
                          <th>Umbrales / Controles</th>
                          <th>Procedimiento</th>
                          <th className="acciones-col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pasosEtapa.map((d: RecetaDetalleConId) => (
                          <tr key={d.id}>
                            <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                            <td>
                              {d.tipo_insumo_id ? (
                                <>
                                  {d.nombre_ingrediente || "Tipo de insumo"}
                                  {d.es_aditivo && d.clase_funcional
                                    ? ` (${d.clase_funcional}${d.numero_ins ? ` - ${d.numero_ins}` : ""})`
                                    : ""}
                                </>
                              ) : (
                                <span style={{ opacity: 0.7 }}>Solo procedimiento / control</span>
                              )}
                            </td>
                            <td>{d.tipo_insumo_id ? `${d.cantidad} ${d.unidad_medida}` : "-"}</td>
                            <td>
                              {d.parametros_control && d.parametros_control.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {d.parametros_control.map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "rgba(37, 99, 235, 0.12)",
                                        color: "#38bdf8",
                                      }}
                                    >
                                      {p.nombre_dato}: {formatearReglaUmbral(p)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{d.descripcion_pasos}</td>
                            <td className="acciones-col">
                              <div className="acciones-btns">
                                <button
                                  type="button"
                                  className="btn-icon btn-editar"
                                  title="Editar paso"
                                  onClick={() => {
                                    setDetalleSeleccionado(d);
                                    setModalEditar(true);
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-eliminar"
                                  title="Quitar paso"
                                  onClick={() => abrirConfirmacion(d)}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="¿Quitar paso de la receta?"
        description={`¿Estás seguro de que deseas quitar el paso "${detalleAConfirmar?.nombre}" de esta nueva versión?`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarBajaDetalle}
        onCancel={() => {
          setDialogAbierto(false);
          setDetalleAConfirmar(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ""}
        onClose={() => setErrorDialogMsg(null)}
      />

      <Dialog open={modalAbierto} onOpenChange={setModal}>
        <DialogContent style={{ maxWidth: "700px" }}>
          <NuevoDetalleReceta
            etapaInicial={etapaParaModal}
            etapasExistentes={Array.from(new Set(detalles.map((d) => d.etapa || "General")))}
            onSuccess={() => setModal(false)}
            onCancel={() => setModal(false)}
            onAgregarMultiples={(nuevos: RecetaDetalleConId[]) => {
              setDetalles((prev) => [...prev, ...nuevos]);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditar} onOpenChange={setModalEditar}>
        <DialogContent style={{ maxWidth: "700px" }}>
          <EditarDetalleReceta
            detalleInicial={detalleSeleccionado}
            etapasExistentes={Array.from(new Set(detalles.map((d) => d.etapa || "General")))}
            onEditarLocal={(detalleEditado: RecetaDetalleConId) => {
              setDetalles((prev) =>
                prev.map((item) => (item.id === detalleEditado.id ? detalleEditado : item))
              );
            }}
            onSuccess={() => setModalEditar(false)}
            onCancel={() => setModalEditar(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}