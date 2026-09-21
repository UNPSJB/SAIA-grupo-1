import { useState } from "react";
import type { InsumoForm } from "./tipos";
import "../../styles/formularioAlta.css";

const UNIDADES = ["kilogramos", "gramos", "litros", "mililitros", "unidades"];

const INSUMO_INICIAL: InsumoForm = {
  nombre: "",
  lote: "",
  fechaRecepcion: "",
  fechaVencimiento: "",
  cantRecibida: "",
  stock: "",
  medida: "",
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const HOY = new Date().toISOString().split("T")[0];

const getMinVencimiento = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

interface NuevoInsumoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoInsumo({ onSuccess, onCancel }: NuevoInsumoProps) {
  const [insumo, setInsumo] = useState<InsumoForm>(INSUMO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setInsumo({ ...insumo, [e.target.name]: e.target.value });
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInsumo({ ...insumo, [e.target.name]: val === "" ? "" : Number(val) });
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validaciones en cliente
    if (!insumo.nombre.trim()) {
      setErrorMsg("El nombre del insumo no puede estar vacío.");
      return;
    }

    if (insumo.cantRecibida === "" || Number(insumo.cantRecibida) <= 0) {
      setErrorMsg("La cantidad recibida debe ser mayor a cero.");
      return;
    }

    if (insumo.stock === "" || Number(insumo.stock) < 0) {
      setErrorMsg("El stock debe ser mayor o igual a cero.");
      return;
    }

    const cantNum = Number(insumo.cantRecibida);
    const stockNum = Number(insumo.stock);

    if (stockNum > cantNum) {
      setErrorMsg("El stock no puede ser mayor a la cantidad recibida.");
      return;
    }

    if (insumo.fechaRecepcion > HOY) {
      setErrorMsg("La fecha de recepción no puede ser posterior a la fecha actual.");
      return;
    }

    if (insumo.fechaVencimiento) {
      const minVenc = getMinVencimiento();
      if (insumo.fechaVencimiento < minVenc) {
        setErrorMsg("La fecha de vencimiento no puede ser anterior a dentro de 7 días.");
        return;
      }
      if (insumo.fechaVencimiento < insumo.fechaRecepcion) {
        setErrorMsg("La fecha de vencimiento no puede ser anterior a la fecha de recepción.");
        return;
      }
    }

    setLoading(true);

    const payload = {
      nombre: insumo.nombre.trim(),
      lote: insumo.lote.trim(),
      fechaRecepcion: insumo.fechaRecepcion,
      fechaVencimiento: insumo.fechaVencimiento || null,
      cantRecibida: cantNum,
      stock: stockNum,
      medida: insumo.medida,
    };

    try {
      const res = await fetch(`${API_URL}/insumos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar el insumo.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Insumo dado de alta exitosamente.");
      setInsumo(INSUMO_INICIAL);
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setInsumo(INSUMO_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Insumo</h1>
        <div className="subtitulo">02 · Formulario</div>
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
            value={insumo.nombre}
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
            value={insumo.lote}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaRecepcion">Fecha de recepción</label>
          <input
            id="fechaRecepcion"
            name="fechaRecepcion"
            type="date"
            max={HOY}
            value={insumo.fechaRecepcion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de vencimiento (opcional)</label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            min={getMinVencimiento()}
            value={insumo.fechaVencimiento}
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
            value={insumo.cantRecibida}
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
            value={insumo.stock}
            onChange={handleNumberChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="medida">Unidad de Medida</label>
          <select id="medida" name="medida" value={insumo.medida} onChange={handleChange} required>
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
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
