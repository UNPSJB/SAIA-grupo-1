import { useState } from "react";
import type { RecetaForm, RecetaDetalleConId } from "./tipos";
import "../../styles/formularioAlta.css";
import NuevoDetalleReceta from "./crearEtapaReceta";
import { apiFetch } from "../../api/client";
import { Dialog, DialogContent } from "../../components/ui/dialog";

const HOY = new Date().toISOString().split("T")[0];

const RECETA_INICIAL: RecetaForm = {
  nombre: "",
  rendimiento_final: "",
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<RecetaDetalleConId[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setReceta({ ...receta, [e.target.name]: e.target.value });
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validación de caracteres permitidos según schemas.py del backend
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
      setErrorMsg("El nombre contiene caracteres no permitidos.");
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

    const tieneIngredienteBase = detalles.some((d) => !d.es_aditivo);
    if (!tieneIngredienteBase) {
      setErrorMsg("La receta debe tener al menos un ingrediente que no sea aditivo.");
      return;
    }

    // Formateamos las fechas para que Pydantic (datetime) las acepte sin error de segundos
    const formatearFechaISO = (fechaStr: string) => {
      if (!fechaStr) return null;
      if (fechaStr === HOY) {
        // Si es hoy, mandamos fecha futura del final del día o fecha actual + 1 min para pasar validar_fecha_creacion
        return `${fechaStr}T23:59:59`;
      }
      return `${fechaStr}T00:00:00`;
    };

    const payload = {
      nombre: receta.nombre.trim(),
      rendimiento_final: Number(receta.rendimiento_final),
      fecha_creacion: formatearFechaISO(receta.fecha_creacion),
      fecha_vigencia: receta.fecha_vigencia ? formatearFechaISO(receta.fecha_vigencia) : null,
      fecha_vencimiento: receta.fecha_vencimiento ? formatearFechaISO(receta.fecha_vencimiento) : null,
      detalles: detalles.map((d) => ({
        ingrediente_id: Number(d.ingrediente_id),
        nombre: d.nombre.trim(),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida.trim(),
        es_aditivo: d.es_aditivo,
        clase_funcional: d.es_aditivo ? d.clase_funcional : null,
        numero_ins: d.es_aditivo ? d.numero_ins : null,
        operario_legajo: Number(d.operario_legajo),
        descripcion_pasos: d.descripcion_pasos.trim(),
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
          <label htmlFor="nombre">Nombre de la Receta</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Pan Lactal"
            value={receta.nombre}
            onChange={handleChange}
            required
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
            placeholder="Introduce el rendimiento final"
            value={receta.rendimiento_final}
            onChange={handleChange}
            required
          />
        </div>

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
              Etapas e Ingredientes
            </h2>
          </div>
          <button type="button" className="btn-guardar" onClick={() => setModalAbierto(true)}>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                    Cargando Etapas...
                  </td>
                </tr>
              ) : detalles?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                    No hay etapas registradas.
                  </td>
                </tr>
              ) : (
                detalles?.map((d: RecetaDetalleConId, index: number) => (
                  <tr key={d.id ?? index}>
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

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent>
          <NuevoDetalleReceta
            onSuccess={() => setModalAbierto(false)}
            onCancel={() => setModalAbierto(false)}
            onAgregarLocal={(nuevoDetalle) => {setDetalles((prev) => [...prev, nuevoDetalle]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}