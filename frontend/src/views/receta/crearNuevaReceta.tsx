import { useEffect, useState } from "react";
import { formatearReglaUmbral, type RecetaForm, type RecetaDetalleConId } from "./tipos";
import "../../styles/formularioAlta.css";
import NuevoDetalleReceta from "./crearEtapaReceta";
import { apiFetch } from "../../api/client";
import { Dialog, DialogContent } from "../../components/ui/dialog";
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

const RECETA_INICIAL: RecetaForm = {
  nombre: "",
  rendimiento_final: "",
  id_producto: "",
  operario_legajo: "",
  fecha_creacion: HOY,
  fecha_vigencia: HOY,
  fecha_vencimiento: "",
  detalles: [],
};

interface NuevaRecetaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevaReceta({ onSuccess, onCancel }: NuevaRecetaProps) {
  const [receta, setReceta] = useState<RecetaForm>(RECETA_INICIAL);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<RecetaDetalleConId[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [etapaParaModal, setEtapaParaModal] = useState<string>("");
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name === "id_producto") {
      const prodSeleccionado = productos.find((p) => p.id === Number(value));
      setReceta((prev) => ({
        ...prev,
        id_producto: value ? Number(value) : "",
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
      setErrorMsg("Debe seleccionar un producto asociado a la receta.");
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
      setErrorMsg("El nombre contiene caracteres no permitidos.");
      return;
    }

    if (!receta.operario_legajo) {
      setErrorMsg("Debe asignar el operario a cargo de la receta.");
      return;
    }

    if (receta.rendimiento_final === "" || Number(receta.rendimiento_final) <= 0) {
      setErrorMsg("Se necesita un rendimiento final mayor a 0 antes de guardar la receta.");
      return;
    }

    if (!receta.fecha_creacion || receta.fecha_creacion < HOY) {
      setErrorMsg("La fecha de creación no puede ser anterior a la fecha actual.");
      return;
    }

    if (receta.fecha_vigencia && receta.fecha_vigencia < HOY) {
      setErrorMsg("La fecha de vigencia no puede ser anterior a la fecha actual.");
      return;
    }

    if (receta.fecha_vencimiento && receta.fecha_vencimiento < HOY) {
      setErrorMsg("La fecha de vencimiento no puede ser anterior a la fecha actual.");
      return;
    }

    if (
      receta.fecha_vigencia &&
      receta.fecha_vencimiento &&
      receta.fecha_vencimiento < receta.fecha_vigencia
    ) {
      setErrorMsg("La fecha de vencimiento no puede ser anterior a la fecha de vigencia.");
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
      fecha_creacion: formatearFechaISO(receta.fecha_creacion),
      fecha_vigencia: receta.fecha_vigencia ? formatearFechaISO(receta.fecha_vigencia) : null,
      fecha_vencimiento: receta.fecha_vencimiento ? formatearFechaISO(receta.fecha_vencimiento) : null,
      detalles: detalles.map((d) => ({
        etapa: d.etapa?.trim() || "General",
        tipo_insumo_id: d.tipo_insumo_id ? Number(d.tipo_insumo_id) : null,
        nombre: d.nombre.trim(),
        cantidad: d.tipo_insumo_id ? Number(d.cantidad) : 0,
        unidad_medida: d.unidad_medida?.trim() || "unidades",
        es_aditivo: d.tipo_insumo_id ? Boolean(d.es_aditivo) : false,
        clase_funcional: d.es_aditivo ? d.clase_funcional : null,
        numero_ins: d.es_aditivo ? d.numero_ins : null,
        descripcion_pasos: d.descripcion_pasos.trim(),
        parametros_control: d.parametros_control ?? [],
      })),
    };

    setLoading(true);

    try {
      const res = await apiFetch(`/recetas/`, {
        method: "POST",
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

      setSuccessMsg("Receta dada de alta exitosamente");
      setReceta(RECETA_INICIAL);
      setDetalles([]);
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

  return (
    <div className="modulo-container" style={{ maxWidth: "860px" }}>
      <div className="modulo-header">
        <h1>Nueva Receta</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="fecha_creacion">Fecha de Creación</label>
          <input
            id="fecha_creacion"
            name="fecha_creacion"
            type="date"
            min={HOY}
            value={receta.fecha_creacion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="id_producto">Producto Asociado</label>
          <select
            id="id_producto"
            name="id_producto"
            value={receta.id_producto}
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
          <label htmlFor="nombre">Nombre de la Receta</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Se autocompleta al elegir el producto (o escriba uno)"
            value={receta.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="operario_legajo">Operario a Cargo de la Receta</label>
          <select
            id="operario_legajo"
            name="operario_legajo"
            value={receta.operario_legajo}
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
                required
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
          <label htmlFor="fecha_vigencia">Fecha de Vigencia (Versión 1)</label>
          <input
            id="fecha_vigencia"
            name="fecha_vigencia"
            type="date"
            min={HOY}
            value={receta.fecha_vigencia}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fecha_vencimiento">Fecha de Vencimiento (Opcional)</label>
          <input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
            min={receta.fecha_vigencia || HOY}
            value={receta.fecha_vencimiento}
            onChange={handleChange}
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
              setModalAbierto(true);
            }}
          >
            + Agregar Paso
          </button>
        </div>

        {detalles.length === 0 ? (
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
            No hay etapas ni pasos registrados. Haga clic en &quot;+ Agregar Paso&quot; para comenzar.
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
                        setModalAbierto(true);
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
                          <th className="acciones-col">Quitar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pasosEtapa.map((d, index) => (
                          <tr key={d.id ?? index}>
                            <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                            <td>
                              {d.tipo_insumo_id ? (
                                <>
                                  {d.nombre_ingrediente ?? `Insumo #${d.tipo_insumo_id}`}
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
                              <button
                                type="button"
                                className="btn-icon btn-eliminar"
                                title="Quitar paso"
                                onClick={() =>
                                  setDetalles((prev) => prev.filter((item) => item.id !== d.id))
                                }
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                              </button>
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

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent style={{ maxWidth: "700px" }}>
          <NuevoDetalleReceta
            etapaInicial={etapaParaModal}
            etapasExistentes={Array.from(new Set(detalles.map((d) => d.etapa || "General")))}
            onSuccess={() => setModalAbierto(false)}
            onCancel={() => setModalAbierto(false)}
            onAgregarMultiples={(nuevos: RecetaDetalleConId[]) => {
              setDetalles((prev) => [...prev, ...nuevos]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}