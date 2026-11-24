import { useEffect, useState } from "react";
import type { ClaseFuncional, RecetaDetalleConId, RecetaDetalleForm } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";

interface TipoInsumoOption {
  id: number;
  nombre: string;
  unidadMedida?: string;
  unidad_medida_abreviatura?: string | null;
  unidad_medida_nombre?: string | null;
  es_aditivo?: boolean;
  clase_funcional?: string | null;
  numero_ins?: string | null;
}

const obtenerUnidadDeTipo = (tipo?: TipoInsumoOption): string => {
  if (!tipo) return "";
  return (
    tipo.unidad_medida_abreviatura ||
    tipo.unidadMedida ||
    tipo.unidad_medida_nombre ||
    ""
  );
};

const DETALLE_INICIAL: RecetaDetalleForm = {
  tipo_insumo_id: "",
  nombre: "",
  cantidad: "",
  unidad_medida: "",
  es_aditivo: false,
  clase_funcional: "",
  numero_ins: "",
  descripcion_pasos: "",
};

const CLASES_FUNCIONALES: ClaseFuncional[] = [
  "Conservante",
  "Antioxidante",
  "Colorante",
  "Edulcorante",
  "Aromatizante",
  "Leudante químico",
  "Emulsionante",
  "Acidulante",
  "Estabilizante",
  "Espesante",
  "Humectante",
  "Regulador de acidez",
  "Potenciador de sabor",
  "Estimulante",
];

interface NuevoDetalleRecetaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onAgregarLocal?: (detalle: RecetaDetalleConId) => void;
}

export default function NuevoDetalleReceta({
  onAgregarLocal,
  onSuccess,
  onCancel,
}: NuevoDetalleRecetaProps) {
  const [detalle, setDetalle] = useState<RecetaDetalleForm>(DETALLE_INICIAL);
  const [tiposInsumos, setTiposInsumos] = useState<TipoInsumoOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchTiposInsumos = async () => {
      try {
        const res = await apiFetch(`/insumos/tipos/`);
        if (!cancelado && res.ok) {
          setTiposInsumos(await res.json());
        }
      } catch {
        if (!cancelado) setTiposInsumos([]);
      }
    };
    fetchTiposInsumos();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleCambiarCategoria(esAditivoNuevo: boolean) {
    setDetalle((prev) => ({
      ...prev,
      es_aditivo: esAditivoNuevo,
      tipo_insumo_id: "",
      unidad_medida: "",
      clase_funcional: "",
      numero_ins: "",
    }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === "tipo_insumo_id") {
      const tipoElegido = tiposInsumos.find((i) => i.id === Number(value));
      const unidadAutocompletada = obtenerUnidadDeTipo(tipoElegido);

      setDetalle((prev) => ({
        ...prev,
        tipo_insumo_id: value ? Number(value) : "",
        unidad_medida: unidadAutocompletada || prev.unidad_medida,
        es_aditivo: tipoElegido ? Boolean(tipoElegido.es_aditivo) : prev.es_aditivo,
        clase_funcional: tipoElegido?.clase_funcional || "",
        numero_ins: tipoElegido?.numero_ins || "",
      }));
      return;
    }

    setDetalle((prev) => ({ ...prev, [name]: value }));
  }

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    function soloLetrasYNumeros(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
      return patron.test(nombre);
    }

    if (!detalle.nombre.trim()) {
      setErrorMsg("El nombre de la etapa no puede estar vacío.");
      return;
    }

    if (detalle.nombre.trim().length < 2) {
      setErrorMsg("El nombre de la etapa debe tener al menos 2 caracteres.");
      return;
    }

    if (!soloLetrasYNumeros(detalle.nombre)) {
      setErrorMsg("No se permiten caracteres especiales en el nombre de la etapa.");
      return;
    }

    if (!detalle.tipo_insumo_id) {
      setErrorMsg("Debe seleccionar un tipo de insumo.");
      return;
    }

    if (detalle.cantidad === "" || Number(detalle.cantidad) <= 0) {
      setErrorMsg("La cantidad tiene que ser mayor a 0.");
      return;
    }

    if (!detalle.unidad_medida.trim()) {
      setErrorMsg("La unidad de medida no puede estar vacía.");
      return;
    }

    if (detalle.es_aditivo) {
      if (!detalle.clase_funcional) {
        setErrorMsg("El aditivo tiene que tener una clase funcional.");
        return;
      }
      const esAromatizante = detalle.clase_funcional.toLowerCase().includes("aromatizante");
      if (!esAromatizante && !detalle.numero_ins.trim()) {
        setErrorMsg("El aditivo tiene que tener un número INS.");
        return;
      }
    }

    if (!detalle.descripcion_pasos.trim()) {
      setErrorMsg("La descripción de pasos no puede estar vacía.");
      return;
    }

    const tipoSeleccionado = tiposInsumos.find((i) => i.id === Number(detalle.tipo_insumo_id));

    onAgregarLocal?.({
      id: Date.now(),
      version_receta_id: 0,
      nombre: detalle.nombre.trim(),
      tipo_insumo_id: Number(detalle.tipo_insumo_id),
      nombre_ingrediente: tipoSeleccionado ? tipoSeleccionado.nombre : null,
      cantidad: Number(detalle.cantidad),
      unidad_medida: detalle.unidad_medida.trim(),
      es_aditivo: detalle.es_aditivo,
      clase_funcional: detalle.es_aditivo && detalle.clase_funcional ? detalle.clase_funcional : null,
      numero_ins: detalle.es_aditivo && detalle.numero_ins.trim() ? detalle.numero_ins.trim() : null,
      descripcion_pasos: detalle.descripcion_pasos.trim(),
    });

    setDetalle(DETALLE_INICIAL);
    onSuccess?.();
  }

  function handleCancelar() {
    setDetalle(DETALLE_INICIAL);
    setErrorMsg(null);
    onCancel?.();
  }

  const tiposFiltrados = tiposInsumos.filter((t) =>
    detalle.es_aditivo ? Boolean(t.es_aditivo) : !t.es_aditivo
  );
  const esAromatizante = (detalle.clase_funcional || "").toLowerCase().includes("aromatizante");

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nueva Etapa de Receta</h1>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label>¿Qué vas a cargar en esta etapa? *</label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={!detalle.es_aditivo ? "btn-guardar" : "btn-cancelar"}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleCambiarCategoria(false)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>nutrition</span>
              Ingrediente
            </button>
            <button
              type="button"
              className={detalle.es_aditivo ? "btn-guardar" : "btn-cancelar"}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleCambiarCategoria(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>science</span>
              Aditivo
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Etapa</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Etapa 1 Amasado"
            value={detalle.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo_insumo_id">
            {detalle.es_aditivo ? "Aditivo *" : "Ingrediente *"}
          </label>
          <select
            id="tipo_insumo_id"
            name="tipo_insumo_id"
            value={detalle.tipo_insumo_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              {detalle.es_aditivo ? "Seleccione un aditivo" : "Seleccione un ingrediente"}
            </option>
            {tiposFiltrados.map((tipo) => {
              const unidad = obtenerUnidadDeTipo(tipo);
              return (
                <option key={tipo.id} value={tipo.id}>
                  {detalle.es_aditivo
                    ? `${tipo.nombre}${tipo.clase_funcional ? ` — ${tipo.clase_funcional}` : ""}${tipo.numero_ins ? ` (${tipo.numero_ins})` : ""}${unidad ? ` [${unidad}]` : ""}`
                    : `${tipo.nombre} ${unidad ? `(${unidad})` : ""}`}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cantidad">Cantidad</label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            step="any"
            min="0.01"
            placeholder="Introduce la cantidad"
            value={detalle.cantidad}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <input
            id="unidad_medida"
            name="unidad_medida"
            type="text"
            placeholder="Se autocompleta al elegir el insumo"
            value={detalle.unidad_medida}
            onChange={handleChange}
            disabled
          />
        </div>

        {detalle.es_aditivo && (
          <>
            <div className="form-group">
              <label htmlFor="clase_funcional">Clase Funcional</label>
              <select
                id="clase_funcional"
                name="clase_funcional"
                value={detalle.clase_funcional}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Seleccione la clase funcional
                </option>
                {CLASES_FUNCIONALES.map((cf) => (
                  <option key={cf} value={cf}>
                    {cf}
                  </option>
                ))}
                {detalle.clase_funcional &&
                  !CLASES_FUNCIONALES.includes(detalle.clase_funcional) && (
                    <option value={detalle.clase_funcional}>{detalle.clase_funcional}</option>
                  )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numero_ins">
                Número INS {esAromatizante ? "(Opcional para aromatizantes)" : "*"}
              </label>
              <input
                id="numero_ins"
                name="numero_ins"
                type="text"
                placeholder="Ej: INS 282"
                value={detalle.numero_ins}
                onChange={handleChange}
                required={!esAromatizante}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="descripcion_pasos">Procedimiento / Pasos</label>
          <textarea
            id="descripcion_pasos"
            name="descripcion_pasos"
            placeholder="Introduce los pasos del procedimiento"
            value={detalle.descripcion_pasos}
            onChange={handleChange}
            rows={4}
            required
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar">
            Guardar
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}