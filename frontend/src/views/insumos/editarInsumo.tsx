import { useState } from "react";
import type { InsumoConId } from "./tipos";
import "../../styles/formularioAlta.css";

const UNIDADES = ["kilogramos", "gramos", "litros", "mililitros", "unidades"];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getMinVencimiento = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

const toInputDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

const formatDate = (dateStr?: string | null) => {
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

interface EditarInsumoProps {
  insumo: InsumoConId;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarInsumo({ insumo, onSuccess, onCancel }: EditarInsumoProps) {
  const [formData, setFormData] = useState({
    nombre: insumo.nombre,
    lote: insumo.lote,
    fechaVencimiento: toInputDate(insumo.fechaVencimiento),
    cantRecibida: insumo.cantRecibida as number | "",
    stock: insumo.stock as number | "",
    medida: insumo.medida,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setFormData({ ...formData, [e.target.name]: val === "" ? "" : Number(val) });
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validaciones en cliente
    if (!formData.nombre.trim()) {
      setErrorMsg("El nombre del insumo no puede estar vacío.");
      return;
    }

    if (formData.cantRecibida === "" || Number(formData.cantRecibida) <= 0) {
      setErrorMsg("La cantidad recibida debe ser mayor a cero.");
      return;
    }

    if (formData.stock === "" || Number(formData.stock) < 0) {
      setErrorMsg("El stock debe ser mayor o igual a cero.");
      return;
    }

    const cantNum = Number(formData.cantRecibida);
    const stockNum = Number(formData.stock);

    if (stockNum > cantNum) {
      setErrorMsg("El stock no puede ser mayor a la cantidad recibida.");
      return;
    }

    if (formData.fechaVencimiento) {
      const minVenc = getMinVencimiento();
      if (formData.fechaVencimiento < minVenc) {
        setErrorMsg("La fecha de vencimiento no puede ser anterior a dentro de 7 días.");
        return;
      }
      const fechaRecepcionInput = toInputDate(insumo.fechaRecepcion);
      if (fechaRecepcionInput && formData.fechaVencimiento < fechaRecepcionInput) {
        setErrorMsg("La fecha de vencimiento no puede ser anterior a la fecha de recepción.");
        return;
      }
    }

    setLoading(true);

    const payload = {
      nombre: formData.nombre.trim(),
      lote: formData.lote.trim(),
      fechaVencimiento: formData.fechaVencimiento || null,
      cantRecibida: cantNum,
      stock: stockNum,
      medida: formData.medida,
    };

    try {
      const res = await fetch(`${API_URL}/insumos/${insumo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al actualizar el insumo.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Insumo modificado exitosamente.");
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Insumo</h1>
        <div className="subtitulo">02 · Modificación</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lote">Lote</label>
          <input
            id="lote"
            name="lote"
            type="text"
            placeholder="Introduce el lote"
            value={formData.lote}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaRecepcion">Fecha de recepción</label>
          <input
            id="fechaRecepcion"
            type="text"
            value={formatDate(insumo.fechaRecepcion)}
            readOnly
            disabled
            style={{ cursor: "not-allowed", opacity: 0.7 }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de vencimiento (opcional)</label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            min={getMinVencimiento()}
            value={formData.fechaVencimiento}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cantRecibida">Cantidad recibida</label>
          <input
            id="cantRecibida"
            name="cantRecibida"
            type="number"
            min="0.01"
            step="any"
            placeholder="Introduce la cantidad recibida"
            value={formData.cantRecibida}
            onChange={handleNumberChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="any"
            placeholder="Introduce el stock"
            value={formData.stock}
            onChange={handleNumberChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="medida">Unidad de Medida</label>
          <select id="medida" name="medida" value={formData.medida} onChange={handleChange} required>
            <option value="" disabled>Seleccione una unidad</option>
            {UNIDADES.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </select>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
