import React, { useEffect, useState } from "react";
import type { ProductoConId, DocumentoReceta } from "./tipos";
import type { UnidadMedidaItem } from "../unidadesMedida/tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";

const PRODUCTO_INICIAL: ProductoConId = {
  id: 0,
  nombre: "",
  descripcion: "",
  unidad_medida_id: null,
  unidadMedida: "",
  id_receta: null,
  activo: true,
};

interface EditarProductoProps {
  productoId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarProducto({ productoId, onSuccess, onCancel }: EditarProductoProps) {
  const [producto, setProducto] = useState<ProductoConId>(PRODUCTO_INICIAL);
  const [recetas, setRecetas] = useState<DocumentoReceta[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargarCatalogos() {
      try {
        const [resRecetas, resUnidades] = await Promise.all([
          apiFetch("/documentos/?tipo=Receta"),
          apiFetch("/unidades-medida/?solo_activos=false"),
        ]);
        if (!cancelado) {
          setRecetas(resRecetas.ok ? await resRecetas.json() : []);
          setUnidades(resUnidades.ok ? await resUnidades.json() : []);
        }
      } catch {
        if (!cancelado) {
          setRecetas([]);
          setUnidades([]);
        }
      }
    }
    cargarCatalogos();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (productoId) {
      const fetchProducto = async () => {
        try {
          const res = await apiFetch(`/productos/${productoId}`);
          if (res.ok) {
            const data = await res.json();
            setProducto(data);
          }
        } catch {
          setErrorMsg("El producto no existe.");
        }
      };
      fetchProducto();
    }
  }, [productoId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setProducto({
      ...producto,
      [name]:
        name === "id_receta" || name === "unidad_medida_id"
          ? value
            ? Number(value)
            : null
          : value,
    });
  }

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!producto.nombre.trim()) {
      setErrorMsg("El nombre del producto no puede estar vacío.");
      return;
    }

    if (!producto.unidad_medida_id) {
      setErrorMsg("Debe seleccionar una unidad de medida.");
      return;
    }

    const payload = {
      nombre: producto.nombre.trim(),
      descripcion: producto.descripcion?.trim() || null,
      unidad_medida_id: Number(producto.unidad_medida_id),
      id_receta: producto.id_receta ? Number(producto.id_receta) : null,
    };

    setLoading(true);

    try {
      const res = await apiFetch(`/productos/${productoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.detail || "Error al actualizar el producto.");
      } else {
        setSuccessMsg("Producto editado exitosamente");
        setExitoDialogAbierto(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Producto</h1>
        <div className="subtitulo">ID: {productoId}</div>
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
            value={producto.nombre}
            onChange={handleChange}
            maxLength={50}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida_id">
            Unidad de Medida <span style={{ color: "var(--color-error-texto)" }}>*</span>
          </label>
          <select
            id="unidad_medida_id"
            name="unidad_medida_id"
            value={producto.unidad_medida_id ?? ""}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione una unidad</option>
            {unidades
              .filter((u) => u.activo || u.id === producto.unidad_medida_id)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.abreviatura})
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
        title="Producto editado con éxito"
        description="Los cambios en el producto fueron guardados correctamente."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}