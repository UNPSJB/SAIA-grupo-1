import { useEffect, useState } from "react";
import type { ClaseFuncional, RecetaDetalleConId } from "./tipos";
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

const DETALLE_INICIAL: RecetaDetalleConId = {
  id: 0,
  version_receta_id: 0,
  tipo_insumo_id: 0,
  nombre: "",
  cantidad: 0,
  unidad_medida: "",
  es_aditivo: false,
  clase_funcional: null,
  numero_ins: null,
  descripcion_pasos: "",
};

const CLASES_FUNCIONALES: ClaseFuncional[] = [
  "conservante",
  "antioxidante",
  "colorante",
  "edulcorantes",
];

interface EditarDetalleRecetaProps {
  detalleInicial: RecetaDetalleConId | null;
  onEditarLocal: (detalleEditado: RecetaDetalleConId) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarDetalleReceta({
  detalleInicial,
  onEditarLocal,
  onSuccess,
  onCancel,
}: EditarDetalleRecetaProps) {
  const [detalle, setDetalle] = useState<RecetaDetalleConId>(DETALLE_INICIAL);
  const [tiposInsumos, setTiposInsumos] = useState<TipoInsumoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
  if (detalleInicial) {
    const idTipoInicial = Number(detalleInicial.tipo_insumo_id ?? 0);
    const tipoElegido = tiposInsumos.find((i) => i.id === idTipoInicial);
    const unidadAutocompletada = obtenerUnidadDeTipo(tipoElegido);
    setDetalle({
      ...detalleInicial,
      tipo_insumo_id: idTipoInicial,
      unidad_medida: unidadAutocompletada || detalleInicial.unidad_medida,
      es_aditivo: tipoElegido
        ? Boolean(tipoElegido.es_aditivo)
        : Boolean(detalleInicial.es_aditivo),
      clase_funcional:
        (tipoElegido?.clase_funcional as ClaseFuncional) ??
        detalleInicial.clase_funcional ??
        null,
      numero_ins: tipoElegido?.numero_ins ?? detalleInicial.numero_ins ?? "",
    });
  }
}, [detalleInicial, tiposInsumos]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setDetalle((prev) => ({
        ...prev,
        es_aditivo: checked,
        clase_funcional: checked ? prev.clase_funcional : null,
        numero_ins: checked ? prev.numero_ins : null,
      }));
      return;
    }

    if (name === "tipo_insumo_id") {
      const idNum = value ? Number(value) : 0;
      const tipoElegido = tiposInsumos.find((i) => i.id === idNum);
      const unidadAutocompletada = obtenerUnidadDeTipo(tipoElegido);
      setDetalle((prev) => ({
        ...prev,
        tipo_insumo_id: idNum,
        ingrediente_id: null,
        unidad_medida: unidadAutocompletada || prev.unidad_medida,
        es_aditivo: tipoElegido ? Boolean(tipoElegido.es_aditivo) : prev.es_aditivo,
        clase_funcional:
          (tipoElegido?.clase_funcional as ClaseFuncional) ?? prev.clase_funcional,
        numero_ins: tipoElegido?.numero_ins ?? prev.numero_ins,
      }));
      return;
    }

    setDetalle({ ...detalle, [name]: value });
  }

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasYNumeros(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
      return patron.test(nombre);
    }

    if (!detalle.nombre.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    if (detalle.nombre.trim().length < 2) {
      setErrorMsg("El nombre de la etapa debe tener al menos 2 caracteres.");
      return;
    }

    if (!soloLetrasYNumeros(detalle.nombre)) {
      setErrorMsg("No se permiten caracteres especiales en el nombre.");
      return;
    }

    if (!detalle.tipo_insumo_id) {
      setErrorMsg("Debe seleccionar un tipo de insumo.");
      return;
    }

    if (!detalle.cantidad || Number(detalle.cantidad) <= 0) {
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
      if (!esAromatizante && (!detalle.numero_ins || !detalle.numero_ins.trim())) {
        setErrorMsg("El aditivo tiene que tener un número INS.");
        return;
      }
    }

    if (!detalle.descripcion_pasos.trim()) {
      setErrorMsg("El Procedimiento no puede estar vacío.");
      return;
    }

    setLoading(true);

    const idTipoFinal = Number(detalle.tipo_insumo_id);
    const tipoSeleccionado = tiposInsumos.find((i) => i.id === idTipoFinal);

    const actualizado: RecetaDetalleConId = {
          ...detalle,
          nombre: detalle.nombre.trim(),
          tipo_insumo_id: idTipoFinal,
          nombre_ingrediente: tipoSeleccionado
            ? tipoSeleccionado.nombre
            : detalle.nombre_ingrediente,
          cantidad: Number(detalle.cantidad),
          unidad_medida: detalle.unidad_medida.trim(),
          es_aditivo: Boolean(detalle.es_aditivo),
          clase_funcional: detalle.es_aditivo
            ? (detalle.clase_funcional as ClaseFuncional)
            : null,
          numero_ins:
            detalle.es_aditivo && detalle.numero_ins
              ? detalle.numero_ins.trim()
              : null,
          descripcion_pasos: detalle.descripcion_pasos.trim(),
        };

    onEditarLocal(actualizado);
    setSuccessMsg("Etapa editada exitosamente");
    setLoading(false);
    onSuccess?.();
  }

  function handleCancelar() {
    setDetalle(DETALLE_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Etapa de Receta</h1>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Etapa</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={detalle.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo_insumo_id">Tipo de Insumo</label>
          <select
            id="tipo_insumo_id"
            name="tipo_insumo_id"
            value={detalle.tipo_insumo_id || ""}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione un tipo de insumo
            </option>
            {tiposInsumos.map((tipo) => {
              const unidad = obtenerUnidadDeTipo(tipo);
              return (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre} {unidad ? `(${unidad})` : ""}
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
            placeholder="Se autocompleta al elegir el tipo de insumo"
            value={detalle.unidad_medida}
            disabled
            readOnly
          />
        </div>

        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            id="es_aditivo"
            name="es_aditivo"
            type="checkbox"
            checked={detalle.es_aditivo}
            onChange={handleChange}
            style={{ width: "auto", margin: 0 }}
          />
          <label htmlFor="es_aditivo" style={{ margin: 0 }}>
            ¿Es Aditivo?
          </label>
        </div>

        {detalle.es_aditivo && (
          <>
            <div className="form-group">
              <label htmlFor="clase_funcional">Clase Funcional</label>
              <select
                id="clase_funcional"
                name="clase_funcional"
                value={detalle.clase_funcional ?? ""}
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
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numero_ins">Número INS</label>
              <input
                id="numero_ins"
                name="numero_ins"
                type="text"
                placeholder="Ej: INS 282"
                value={detalle.numero_ins ?? ""}
                onChange={handleChange}
                required
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
    </div>
  );
}