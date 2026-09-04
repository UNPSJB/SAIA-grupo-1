import { useState } from "react";
import type { Insumo } from "./tipos";
import "../../styles/formularioAlta.css";

const UNIDADES = ["kilogramos", "gramos", "litros", "mililitros", "unidades"];

const INSUMO_INICIAL: Insumo = {
  nombre: "",
  lote: "",
  fechaRecepcion: "",
  fechaVencimiento: "",
  cantRecibida: 0,
  stock: 0,
  medida: "",
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface NuevoInsumoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoInsumo({ onSuccess, onCancel }: NuevoInsumoProps) {
  const [insumo, setInsumo] = useState<Insumo>(INSUMO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setInsumo({ ...insumo, [e.target.name]: e.target.value });
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInsumo({ ...insumo, [e.target.name]: Number(e.target.value) });
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    // el backend espera null (o el campo ausente) si no hay fecha de vencimiento, no un string vacío
    const payload = { ...insumo, fechaVencimiento: insumo.fechaVencimiento || null };

    try {
      const res = await fetch(`${API_URL}/insumos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al guardar el insumo.");
      }

      setSuccessMsg("Insumo dado de alta exitosamente.");
      setInsumo(INSUMO_INICIAL);
      onSuccess?.();
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
            value={insumo.fechaRecepcion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de vencimiento</label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
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
