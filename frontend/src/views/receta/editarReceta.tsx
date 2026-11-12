import { useEffect, useState } from "react";
import type { RecetaConId, RecetaDetalleConId } from "./tipos";
import "../../styles/formularioAlta.css";
import EditarDetalleReceta from "./editarEtapaReceta";
import NuevoDetalleReceta from "./crearEtapaReceta";
import { ConfirmAlertDialog, ErrorAlertDialog } from "../../components/ui/alert-dialog";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { apiFetch } from "../../api/client";

const HOY = new Date().toISOString().split("T")[0];

const RECETA_INICIAL: RecetaConId = {
  id: 0,
  nombre: "",
  rendimiento_final: 0,
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
  const [detalles, setDetalles] = useState<RecetaDetalleConId[]>([]);
  const [fechaVigencia, setFechaVigencia] = useState<string>(HOY);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalAbierto, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<RecetaDetalleConId | null>(null);
  const [detalleAConfirmar, setDetalleAConfirmar] = useState<RecetaDetalleConId | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

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
          setDetalles(data.detalles ?? data.version_actual?.detalles ?? []);
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
    setReceta({ ...receta, [e.target.name]: e.target.value });
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function nombreValido(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s.,;()\-_]+$/;
      return patron.test(nombre);
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

    if (!receta.rendimiento_final || Number(receta.rendimiento_final) <= 0) {
      setErrorMsg("El rendimiento final debe ser mayor a 0.");
      return;
    }

    if (detalles.length === 0) {
      setErrorMsg("Por favor agregue al menos una etapa / ingrediente a la receta.");
      return;
    }

    const tieneIngredienteBase = detalles.some((d) => !d.es_aditivo);
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
      fecha_vigencia: fechaVigencia ? formatearFechaISO(fechaVigencia) : null,
      fecha_vencimiento: fechaVencimiento ? formatearFechaISO(fechaVencimiento) : null,
      detalles: detalles.map((d) => ({
        ingrediente_id: Number(d.ingrediente_id),
        nombre: d.nombre.trim(),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida.trim(),
        es_aditivo: Boolean(d.es_aditivo),
        clase_funcional: d.es_aditivo ? d.clase_funcional : null,
        numero_ins: d.es_aditivo ? d.numero_ins : null,
        operario_legajo: Number(d.operario_legajo),
        descripcion_pasos: d.descripcion_pasos.trim(),
      })),
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
          <label htmlFor="rendimiento_final">Rendimiento Final</label>
          <input
            id="rendimiento_final"
            name="rendimiento_final"
            type="number"
            step="any"
            min="0.01"
            value={receta.rendimiento_final}
            onChange={handleChange}
          />
        </div>

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
              Etapas e Ingredientes
            </h2>
          </div>
          <button type="button" className="btn-guardar" onClick={() => setModal(true)}>
            + Agregar Etapa
          </button>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-custom">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Ingrediente / Aditivo</th>
                <th>Cantidad</th>
                <th>Procedimiento</th>
                <th>Operario a Cargo</th>
                <th className="acciones-col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    Cargando Etapas...
                  </td>
                </tr>
              ) : detalles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    No hay Etapas registradas.
                  </td>
                </tr>
              ) : (
                detalles.map((d: RecetaDetalleConId) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.nombre}</td>
                    <td>
                      {d.nombre_ingrediente ?? `Insumo #${d.ingrediente_id}`}
                      {d.es_aditivo && d.clase_funcional
                        ? ` (${d.clase_funcional}${d.numero_ins ? ` - ${d.numero_ins}` : ""})`
                        : ""}
                    </td>
                    <td>
                      {d.cantidad} {d.unidad_medida}
                    </td>
                    <td>{d.descripcion_pasos}</td>
                    <td>{d.nombre_operario ?? `Legajo #${d.operario_legajo}`}</td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          type="button"
                          className="btn-icon btn-editar"
                          title="Editar etapa"
                          onClick={() => {
                            setDetalleSeleccionado(d);
                            setModalEditar(true);
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-eliminar"
                          title="Quitar etapa"
                          onClick={() => abrirConfirmacion(d)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
        title="¿Quitar etapa de la receta?"
        description={`¿Estás seguro de que deseas quitar la etapa "${detalleAConfirmar?.nombre}" de esta nueva versión?`}
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
        <DialogContent>
          <NuevoDetalleReceta
            onSuccess={() => setModal(false)}
            onCancel={() => setModal(false)}
            onAgregarLocal={(nuevoDetalle: RecetaDetalleConId) => {
              setDetalles((prev) => [...prev, nuevoDetalle]);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditar} onOpenChange={setModalEditar}>
        <DialogContent>
          <EditarDetalleReceta
            detalleInicial={detalleSeleccionado}
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