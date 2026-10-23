import React, { useEffect, useState } from "react";
import type { Producto, DocumentoReceta } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";

const UNIDADES_MEDIDA = [
  { value: "kilogramos", label: "kilogramos" },
  { value: "gramos", label: "gramos" },
  { value: "litros", label: "litros" },
  { value: "mililitros", label: "mililitros" },
  { value: "unidades", label: "unidades" },
];

const PRODUCTO_INICIAL: Producto = {
  nombre: "",
  descripcion: "",
  unidadMedida: "",
  id_receta: null,
  activo: true,
};

interface NuevoProductoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoProducto({ onSuccess, onCancel }: NuevoProductoProps) {
  const [producto, setProducto] = useState<Producto>(PRODUCTO_INICIAL);
  const [recetas, setRecetas] = useState<DocumentoReceta[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargarRecetas() {
      try {
        const res = await apiFetch("/documentos/?tipo=RECETA");
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) setRecetas(data);
        }
      } catch {
        if (!cancelado) setRecetas([]);
      }
    }
    cargarRecetas();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setProducto({
      ...producto,
      [name]: name === "id_receta" ? (value ? Number(value) : null) : value,
    });
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = producto.nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg("El nombre del producto no puede estar vacío.");
      return;
    }

    if (!producto.unidadMedida) {
      setErrorMsg("Debe seleccionar una unidad de medida.");
      return;
    }

    const payload = {
      nombre: nombreLimpio,
      descripcion: producto.descripcion?.trim() || null,
      unidadMedida: producto.unidadMedida,
      id_receta: producto.id_receta ? Number(producto.id_receta) : null,
    };

    setLoading(true);

    try {
      const res = await apiFetch("/productos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar el producto.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Producto dado de alta exitosamente");
      setProducto(PRODUCTO_INICIAL);
      setExitoDialogAbierto(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setProducto(PRODUCTO_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Producto Elaborado</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">
            Nombre del Producto <span style={{ color: "var(--color-error-texto)" }}>*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduzca el nombre del producto"
            value={producto.nombre}
            onChange={handleChange}
            maxLength={50}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidadMedida">
            Unidad de Medida <span style={{ color: "var(--color-error-texto)" }}>*</span>
          </label>
          <select
            id="unidadMedida"
            name="unidadMedida"
            value={producto.unidadMedida}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione una unidad</option>
            {UNIDADES_MEDIDA.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="id_receta">Receta Asociada (Opcional)</label>
          <select
            id="id_receta"
            name="id_receta"
            value={producto.id_receta ?? ""}
            onChange={handleChange}
          >
            <option value="">-- Sin receta asociada --</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titulo}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción (Opcional)</label>
          <input
            id="descripcion"
            name="descripcion"
            type="text"
            placeholder="Descripción opcional"
            value={producto.descripcion || ""}
            onChange={handleChange}
            maxLength={100}
          />
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

      <SuccessAlertDialog
        open={exitoDialogAbierto}
        title="Producto registrado con éxito"
        description="El nuevo producto elaborado fue registrado en el sistema."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}