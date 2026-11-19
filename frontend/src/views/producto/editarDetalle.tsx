import React, { useEffect, useState } from "react";
import type { ProductoConId, DocumentoReceta, AlergenoItem } from "./tipos";
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
  conservacion:"",
  alergenos_precaucion_ids:[],
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
  const [alergenos, setAlergenos] = useState<AlergenoItem[]>([]);

  useEffect(() => {
    let cancelado = false;
    async function cargarCatalogos() {
      try {
        const [resRecetas, resUnidades,resAlergenos] = await Promise.all([
          apiFetch("/documentos/?tipo=Receta"),
          apiFetch("/unidades-medida/?solo_activos=false"),
          apiFetch("/alergenos/"),
        ]);
        if (!cancelado) {
          setRecetas(resRecetas.ok ? await resRecetas.json() : []);
          setUnidades(resUnidades.ok ? await resUnidades.json() : []);
          setAlergenos(resAlergenos.ok ? await resAlergenos.json() : []);
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
            const idsDesdeObjetos = Array.isArray(data.alergenos_precaucion)
              ? data.alergenos_precaucion.map((a: { id: number }) => a.id)
              : [];
            setProducto({
              ...data,
              conservacion: data.conservacion ?? "",
              alergenos_precaucion_ids: Array.isArray(data.alergenos_precaucion_ids)
                ? data.alergenos_precaucion_ids
                : idsDesdeObjetos,
            });
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
      conservacion: producto.conservacion?.trim() || null,
      alergenos_precaucion_ids: producto.alergenos_precaucion_ids || [],
      unidad_medida_id: Number(producto.unidad_medida_id),
      id_receta: producto.id_receta ? Number(producto.id_receta) : null,
      peso_unidad_g: producto.peso_unidad_g && Number(producto.peso_unidad_g) > 0 ? Number(producto.peso_unidad_g) : null,
      aplica_rotulado: producto.aplica_rotulado !== false,
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

function toggleAlergenoPrecaucion(alergenoId: number) {
    setProducto((prev) => {
      const actuales = prev.alergenos_precaucion_ids || [];
      const existe = actuales.includes(alergenoId);
      return {
        ...prev,
        alergenos_precaucion_ids: existe
          ? actuales.filter((id) => id !== alergenoId)
          : [...actuales, alergenoId],
      };
    });
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
          <label htmlFor="peso_unidad_g">
            Peso equivalente de 1 unidad de producto (en gramos)
          </label>
          <input
            id="peso_unidad_g"
            name="peso_unidad_g"
            type="number"
            min="1"
            step="any"
            placeholder="Sin datos"
            value={producto.peso_unidad_g ?? ""}
            onChange={(e) =>
              setProducto({
                ...producto,
                peso_unidad_g: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "0.75rem" }}>
          <input
            id="aplica_rotulado"
            name="aplica_rotulado"
            type="checkbox"
            checked={producto.aplica_rotulado !== false}
            onChange={(e) =>
              setProducto({
                ...producto,
                aplica_rotulado: e.target.checked,
              })
            }
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <label htmlFor="aplica_rotulado" style={{ margin: 0, cursor: "pointer" }}>
            Se aplica rotulado y tabla nutricional a este producto
          </label>
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

        <div className="form-group">
          <label>Alérgenos por Posible Contaminación Cruzada ("Puede contener")</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "8px",
              marginTop: "6px",
            }}
          >
            {alergenos.map((alg) => {
              const checked = (producto.alergenos_precaucion_ids || []).includes(alg.id);
              return (
                <label
                  key={alg.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAlergenoPrecaucion(alg.id)}
                  />
                  <span>{alg.nombre}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="conservacion">Condiciones de Conservación (Opcional)</label>
          <input
            id="conservacion"
            name="conservacion"
            type="text"
            placeholder="Ej: Conservar en lugar fresco y seco"
            value={producto.conservacion || ""}
            onChange={handleChange}
            maxLength={200}
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