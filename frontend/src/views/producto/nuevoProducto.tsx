import React, { useEffect, useState } from "react";
import type { Producto, AlergenoItem } from "./tipos";
import type { UnidadMedidaItem } from "../unidadesMedida/tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { SuccessAlertDialog } from "../../components/ui/alert-dialog";

interface RecetaOpcion {
  id: number;
  nombre: string;
  activo?: boolean;
}

const PRODUCTO_INICIAL: Producto = {
  nombre: "",
  descripcion: "",
  unidad_medida_id: null,
  unidadMedida: "",
  id_receta: null,
  peso_unidad_g: null,
  aplica_rotulado: true,
  activo: true,
  conservacion:"",
  alergenos_precaucion_ids:[],
};

interface NuevoProductoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoProducto({ onSuccess, onCancel }: NuevoProductoProps) {
  const [producto, setProducto] = useState<Producto>(PRODUCTO_INICIAL);
  const [recetas, setRecetas] = useState<RecetaOpcion[]>([]);
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
        const [resRecetas, resUnidades, resAlergenos] = await Promise.all([
          apiFetch("/recetas/"),
          apiFetch("/unidades-medida/?solo_activos=true"),
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
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

    const nombreLimpio = producto.nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg("El nombre del producto no puede estar vacío.");
      return;
    }

    if (!producto.unidad_medida_id) {
      setErrorMsg("Debe seleccionar una unidad de medida.");
      return;
    }

    const unidadSel = unidades.find((u) => u.id === Number(producto.unidad_medida_id));
    const nomU = (unidadSel?.nombre || "").toLowerCase();
    const esGramos = ["gramos", "gramo", "g"].includes(nomU);
    const eqG = esGramos
      ? 1
      : producto.equivalencia_gramos_unidad && Number(producto.equivalencia_gramos_unidad) > 0
      ? Number(producto.equivalencia_gramos_unidad)
      : ["kilogramos", "kilogramo", "kg"].includes(nomU)
      ? 1000
      : null;
    const cantEnv =
      producto.cantidad_por_envase && Number(producto.cantidad_por_envase) > 0
        ? Number(producto.cantidad_por_envase)
        : null;
    const pesoCalculado = eqG && cantEnv ? Math.round(eqG * cantEnv * 100) / 100 : null;
    const tamPorcion =
      producto.tamano_porcion_g && Number(producto.tamano_porcion_g) > 0
        ? Number(producto.tamano_porcion_g)
        : null;

    if (!esGramos && !eqG) {
      setErrorMsg("Debe indicar a cuántos gramos equivale 1 unidad de la medida seleccionada.");
      return;
    }
    if (!cantEnv) {
      setErrorMsg("Debe indicar cuánto contiene 1 unidad / envase discreto del producto.");
      return;
    }

    const payload = {
      nombre: nombreLimpio,
      descripcion: producto.descripcion?.trim() || null,
      conservacion: producto.conservacion?.trim() || null,
      alergenos_precaucion_ids: producto.alergenos_precaucion_ids || [],
      unidad_medida_id: Number(producto.unidad_medida_id),
      id_receta: producto.id_receta ? Number(producto.id_receta) : null,
      equivalencia_gramos_unidad: eqG,
      cantidad_por_envase: cantEnv,
      peso_unidad_g: pesoCalculado,
      tamano_porcion_g: tamPorcion,
      aplica_rotulado: producto.aplica_rotulado !== false,
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
            {unidades.map((u) => (
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
            {recetas
              .filter((r) => r.activo !== false)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
          </select>
        </div>

        {(() => {
          const unidadSel = unidades.find((u) => u.id === Number(producto.unidad_medida_id));
          const nomU = (unidadSel?.nombre || "").toLowerCase();
          const esGramos = ["gramos", "gramo", "g"].includes(nomU);
          const esKilos = ["kilogramos", "kilogramo", "kg"].includes(nomU);
          const etiquetaUnidad = unidadSel ? unidadSel.abreviatura || unidadSel.nombre : "unidad";
          const eqVal = esGramos
            ? 1
            : producto.equivalencia_gramos_unidad ?? (esKilos ? 1000 : "");
          const cantEnv = producto.cantidad_por_envase ?? "";
          const pesoEnvaseG =
            eqVal && cantEnv ? Math.round(Number(eqVal) * Number(cantEnv) * 100) / 100 : null;
          const tamPorc = producto.tamano_porcion_g ?? "";
          const porcionesEnv =
            pesoEnvaseG && tamPorc && Number(tamPorc) > 0
              ? Math.round((pesoEnvaseG / Number(tamPorc)) * 100) / 100
              : null;

          return (
            <>
              {unidadSel && !esGramos && (
                <div className="form-group">
                  <label htmlFor="equivalencia_gramos_unidad">
                    1 {etiquetaUnidad} equivale a (gramos){" "}
                    <span style={{ color: "var(--color-error-texto)" }}>*</span>
                  </label>
                  <input
                    id="equivalencia_gramos_unidad"
                    name="equivalencia_gramos_unidad"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder={`Ej: 1000 para 1 ${etiquetaUnidad}`}
                    value={eqVal}
                    onChange={(e) =>
                      setProducto({
                        ...producto,
                        equivalencia_gramos_unidad: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="cantidad_por_envase">
                  Contenido de 1 unidad / envase del producto (en {unidadSel ? unidadSel.nombre : "su unidad"}){" "}
                  <span style={{ color: "var(--color-error-texto)" }}>*</span>
                </label>
                <input
                  id="cantidad_por_envase"
                  name="cantidad_por_envase"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder={
                    unidadSel
                      ? `Ej: 2 para un envase de 2 ${etiquetaUnidad}`
                      : "Cantidad por unidad discreta del producto"
                  }
                  value={cantEnv}
                  onChange={(e) =>
                    setProducto({
                      ...producto,
                      cantidad_por_envase: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tamano_porcion_g">Tamaño de Porción (en gramos)</label>
                <input
                  id="tamano_porcion_g"
                  name="tamano_porcion_g"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Ej: 200 g por porción"
                  value={tamPorc}
                  onChange={(e) =>
                    setProducto({
                      ...producto,
                      tamano_porcion_g: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>

              {pesoEnvaseG !== null && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-borde)",
                    marginBottom: "14px",
                    fontSize: "0.86rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span>
                    <strong>Peso de 1 envase / unidad:</strong> {pesoEnvaseG} g
                  </span>
                  {porcionesEnv !== null && (
                    <span>
                      <strong>Porciones por envase (calculado):</strong> {porcionesEnv}
                    </span>
                  )}
                </div>
              )}
            </>
          );
        })()}

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
            placeholder="Descripción opcional"
            value={producto.descripcion || ""}
            onChange={handleChange}
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>Alérgenos por Posible Contaminación Cruzada ("Puede contener")</label>
          <div className="alergenos-seleccion-lista">
            {alergenos.map((alg) => {
              const checked = (producto.alergenos_precaucion_ids || []).includes(alg.id);
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => toggleAlergenoPrecaucion(alg.id)}
                  className={`alergeno-chip-btn ${checked ? 'seleccionado' : ''}`}
                >
                  {alg.simbolo && (
                    <img
                      src={alg.simbolo}
                      alt={alg.nombre}
                      className="alergeno-chip-icono"
                    />
                  )}
                  <span className="alergeno-chip-texto">{alg.nombre}</span>
                </button>
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