import { useEffect, useState } from "react";
import {
  ETAPAS_PREDEFINIDAS,
  formatearReglaUmbral,
  type ClaseFuncional,
  type CondicionUmbral,
  type ParametroControlReceta,
  type RecetaDetalleConId,
} from "./tipos";
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
  etapa: "Preparación",
  tipo_insumo_id: null,
  nombre: "",
  cantidad: 0,
  unidad_medida: "",
  es_aditivo: false,
  clase_funcional: null,
  numero_ins: null,
  descripcion_pasos: "",
  parametros_control: [],
};

interface EditarDetalleRecetaProps {
  detalleInicial: RecetaDetalleConId | null;
  etapasExistentes?: string[];
  onEditarLocal: (detalleEditado: RecetaDetalleConId) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarDetalleReceta({
  detalleInicial,
  etapasExistentes = [],
  onEditarLocal,
  onSuccess,
  onCancel,
}: EditarDetalleRecetaProps) {
  const [detalle, setDetalle] = useState<RecetaDetalleConId>(DETALLE_INICIAL);
  const [etapaPersonalizada, setEtapaPersonalizada] = useState<string>("");
  const [llevaInsumo, setLlevaInsumo] = useState<boolean>(true);
  const [tiposInsumos, setTiposInsumos] = useState<TipoInsumoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [nombreUmbral, setNombreUmbral] = useState<string>("");
  const [unidadUmbral, setUnidadUmbral] = useState<string>("");
  const [condicionUmbral, setCondicionUmbral] = useState<CondicionUmbral>("RANGO");
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");
  const [valorUnico, setValorUnico] = useState<string>("");

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

  const opcionesEtapa = Array.from(
    new Set([
      ...ETAPAS_PREDEFINIDAS,
      ...etapasExistentes.filter(Boolean),
      ...(detalleInicial?.etapa ? [detalleInicial.etapa] : []),
    ])
  );

  useEffect(() => {
    if (detalleInicial) {
      const idTipoInicial = detalleInicial.tipo_insumo_id ? Number(detalleInicial.tipo_insumo_id) : null;
      const tipoElegido = idTipoInicial ? tiposInsumos.find((i) => i.id === idTipoInicial) : undefined;
      const unidadAutocompletada = obtenerUnidadDeTipo(tipoElegido);
      setLlevaInsumo(Boolean(idTipoInicial));
      setDetalle({
        ...detalleInicial,
        etapa: detalleInicial.etapa || "Preparación",
        tipo_insumo_id: idTipoInicial,
        unidad_medida: unidadAutocompletada || detalleInicial.unidad_medida || "",
        es_aditivo: tipoElegido
          ? Boolean(tipoElegido.es_aditivo)
          : Boolean(detalleInicial.es_aditivo),
        clase_funcional:
          (tipoElegido?.clase_funcional as ClaseFuncional) ??
          detalleInicial.clase_funcional ??
          null,
        numero_ins: tipoElegido?.numero_ins ?? detalleInicial.numero_ins ?? "",
        parametros_control: detalleInicial.parametros_control ?? [],
      });
    }
  }, [detalleInicial, tiposInsumos]);

  function handleCambiarCategoria(esAditivoNuevo: boolean) {
    setDetalle((prev) => ({
      ...prev,
      es_aditivo: esAditivoNuevo,
      tipo_insumo_id: null,
      unidad_medida: "",
      clase_funcional: null,
      numero_ins: null,
    }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === "tipo_insumo_id") {
      const idNum = value ? Number(value) : null;
      const tipoElegido = idNum ? tiposInsumos.find((i) => i.id === idNum) : undefined;
      const unidadAutocompletada = obtenerUnidadDeTipo(tipoElegido);
      setDetalle((prev) => ({
        ...prev,
        tipo_insumo_id: idNum,
        unidad_medida: unidadAutocompletada || prev.unidad_medida,
        es_aditivo: tipoElegido ? Boolean(tipoElegido.es_aditivo) : prev.es_aditivo,
        clase_funcional: tipoElegido?.clase_funcional ?? null,
        numero_ins: tipoElegido?.numero_ins ?? "",
      }));
      return;
    }

    setDetalle((prev) => ({ ...prev, [name]: value }));
  }

  function agregarUmbral() {
    setErrorMsg(null);
    const nom = nombreUmbral.trim();
    if (!nom) {
      setErrorMsg("Ingrese el nombre del parámetro de control.");
      return;
    }
    let minVal: number | null = null;
    let maxVal: number | null = null;

    if (condicionUmbral === "RANGO") {
      if (valorMin === "" || valorMax === "") {
        setErrorMsg("Para un rango debe indicar mínimo y máximo.");
        return;
      }
      minVal = Number(valorMin);
      maxVal = Number(valorMax);
      if (Number.isNaN(minVal) || Number.isNaN(maxVal) || minVal > maxVal) {
        setErrorMsg("El valor mínimo no puede ser mayor que el máximo.");
        return;
      }
    } else if (condicionUmbral === "MENOR_QUE") {
      if (valorUnico === "" || Number.isNaN(Number(valorUnico))) {
        setErrorMsg("Indique el valor límite superior.");
        return;
      }
      maxVal = Number(valorUnico);
    } else if (condicionUmbral === "MAYOR_QUE") {
      if (valorUnico === "" || Number.isNaN(Number(valorUnico))) {
        setErrorMsg("Indique el valor límite inferior.");
        return;
      }
      minVal = Number(valorUnico);
    } else if (condicionUmbral === "EXACTO") {
      if (valorUnico === "" || Number.isNaN(Number(valorUnico))) {
        setErrorMsg("Indique el valor exacto requerido.");
        return;
      }
      minVal = Number(valorUnico);
      maxVal = Number(valorUnico);
    }

    const nuevo: ParametroControlReceta = {
      nombre_dato: nom,
      unidad_medida: unidadUmbral.trim() || null,
      condicion: condicionUmbral,
      umbral_minimo: minVal,
      umbral_maximo: maxVal,
    };

    setDetalle((prev) => ({
      ...prev,
      parametros_control: [...(prev.parametros_control ?? []), nuevo],
    }));
    setNombreUmbral("");
    setUnidadUmbral("");
    setValorMin("");
    setValorMax("");
    setValorUnico("");
  }

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const etapaFinal =
      (detalle.etapa === "__OTRA__" ? etapaPersonalizada : detalle.etapa || "General").trim() ||
      "General";

    if (!detalle.nombre.trim() || detalle.nombre.trim().length < 2) {
      setErrorMsg("El nombre del paso debe tener al menos 2 caracteres.");
      return;
    }

    if (llevaInsumo) {
      if (!detalle.tipo_insumo_id) {
        setErrorMsg("Debe seleccionar un ingrediente o aditivo.");
        return;
      }
      if (!detalle.cantidad || Number(detalle.cantidad) <= 0) {
        setErrorMsg("La cantidad tiene que ser mayor a 0.");
        return;
      }
      if (detalle.es_aditivo) {
        if (!detalle.clase_funcional) {
          setErrorMsg("El aditivo tiene que tener una clase funcional.");
          return;
        }
        const esArom = detalle.clase_funcional.toLowerCase().includes("aromatizante");
        if (!esArom && (!detalle.numero_ins || !detalle.numero_ins.trim())) {
          setErrorMsg("El aditivo tiene que tener un número INS.");
          return;
        }
      }
    }

    if (!detalle.descripcion_pasos.trim()) {
      setErrorMsg("El procedimiento no puede estar vacío.");
      return;
    }

    setLoading(true);

    const idTipoFinal = llevaInsumo && detalle.tipo_insumo_id ? Number(detalle.tipo_insumo_id) : null;
    const tipoSeleccionado = idTipoFinal ? tiposInsumos.find((i) => i.id === idTipoFinal) : undefined;

    const actualizado: RecetaDetalleConId = {
      ...detalle,
      etapa: etapaFinal,
      nombre: detalle.nombre.trim(),
      tipo_insumo_id: idTipoFinal,
      nombre_ingrediente: idTipoFinal
        ? tipoSeleccionado
          ? tipoSeleccionado.nombre
          : detalle.nombre_ingrediente
        : null,
      cantidad: idTipoFinal ? Number(detalle.cantidad) : 0,
      unidad_medida: idTipoFinal ? detalle.unidad_medida.trim() || "gramos" : "unidades",
      es_aditivo: idTipoFinal ? Boolean(detalle.es_aditivo) : false,
      clase_funcional:
        idTipoFinal && detalle.es_aditivo ? (detalle.clase_funcional as ClaseFuncional) : null,
      numero_ins:
        idTipoFinal && detalle.es_aditivo && detalle.numero_ins ? detalle.numero_ins.trim() : null,
      descripcion_pasos: detalle.descripcion_pasos.trim(),
      parametros_control: detalle.parametros_control ?? [],
    };

    onEditarLocal(actualizado);
    setLoading(false);
    onSuccess?.();
  }

  const tiposFiltrados = tiposInsumos.filter((t) =>
    detalle.es_aditivo ? Boolean(t.es_aditivo) : !t.es_aditivo
  );
  const esAromatizante = (detalle.clase_funcional || "").toLowerCase().includes("aromatizante");
  const umbralesActuales = detalle.parametros_control ?? [];

  return (
    <div
      className="modulo-container formulario-box"
      style={{ maxHeight: "82vh", overflowY: "auto", paddingRight: "8px" }}
    >
      <div className="modulo-header">
        <h1>Editar Paso de Receta</h1>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="etapa">Etapa *</label>
          <select
            id="etapa"
            name="etapa"
            value={detalle.etapa || "Preparación"}
            onChange={handleChange}
            required
          >
            {opcionesEtapa.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
            <option value="__OTRA__">+ Otra etapa personalizada...</option>
          </select>
        </div>

        {detalle.etapa === "__OTRA__" && (
          <div className="form-group">
            <label htmlFor="etapa-custom-edit">Nombre de la Nueva Etapa *</label>
            <input
              id="etapa-custom-edit"
              type="text"
              value={etapaPersonalizada}
              onChange={(e) => setEtapaPersonalizada(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="nombre">Nombre del Paso *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={detalle.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion_pasos">Descripción / Procedimiento *</label>
          <textarea
            id="descripcion_pasos"
            name="descripcion_pasos"
            value={detalle.descripcion_pasos}
            onChange={handleChange}
            rows={3}
            required
          />
        </div>

        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="lleva-insumo"
            type="checkbox"
            checked={llevaInsumo}
            onChange={(e) => setLlevaInsumo(e.target.checked)}
            style={{ width: "auto", margin: 0 }}
          />
          <label htmlFor="lleva-insumo" style={{ margin: 0 }}>
            Este paso incorpora un ingrediente o aditivo
          </label>
        </div>

        {llevaInsumo && (
          <>
            <div className="form-group">
              <label>Clasificación *</label>
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
              <label htmlFor="tipo_insumo_id">
                {detalle.es_aditivo ? "Aditivo *" : "Ingrediente *"}
              </label>
              <select
                id="tipo_insumo_id"
                name="tipo_insumo_id"
                value={detalle.tipo_insumo_id || ""}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label htmlFor="cantidad">Cantidad *</label>
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
                  value={detalle.unidad_medida}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {detalle.es_aditivo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label htmlFor="clase_funcional">Clase Funcional</label>
                  <input
                    id="clase_funcional"
                    name="clase_funcional"
                    type="text"
                    value={detalle.clase_funcional ?? ""}
                    placeholder="Desde catálogo de aditivos"
                    disabled
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="numero_ins">Número INS</label>
                  <input
                    id="numero_ins"
                    name="numero_ins"
                    type="text"
                    value={
                      detalle.numero_ins ||
                      (detalle.tipo_insumo_id ? (esAromatizante ? "No aplica" : "") : "")
                    }
                    placeholder="Desde catálogo de aditivos"
                    disabled
                    readOnly
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div
          style={{
            border: "1px solid var(--color-borde, #334155)",
            borderRadius: "8px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
            Umbrales / Controles de Calidad
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: "8px", marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="Parámetro (Ej: Temperatura interna)"
              value={nombreUmbral}
              onChange={(e) => setNombreUmbral(e.target.value)}
            />
            <input
              type="text"
              placeholder="Unidad (Ej: °C)"
              value={unidadUmbral}
              onChange={(e) => setUnidadUmbral(e.target.value)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <select
              value={condicionUmbral}
              onChange={(e) => setCondicionUmbral(e.target.value as CondicionUmbral)}
            >
              <option value="RANGO">Dentro del rango (mín - máx)</option>
              <option value="MENOR_QUE">Por debajo del valor (≤)</option>
              <option value="MAYOR_QUE">Por arriba del valor (≥)</option>
              <option value="EXACTO">Valor exacto (=)</option>
            </select>

            {condicionUmbral === "RANGO" ? (
              <>
                <input
                  type="number"
                  step="any"
                  placeholder="Mínimo"
                  value={valorMin}
                  onChange={(e) => setValorMin(e.target.value)}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Máximo"
                  value={valorMax}
                  onChange={(e) => setValorMax(e.target.value)}
                />
              </>
            ) : (
              <input
                type="number"
                step="any"
                placeholder={
                  condicionUmbral === "MENOR_QUE"
                    ? "Valor máximo"
                    : condicionUmbral === "MAYOR_QUE"
                    ? "Valor mínimo"
                    : "Valor exacto"
                }
                value={valorUnico}
                onChange={(e) => setValorUnico(e.target.value)}
              />
            )}
          </div>

          <button
            type="button"
            className="btn-cancelar"
            style={{ width: "100%", marginBottom: umbralesActuales.length > 0 ? "10px" : "0" }}
            onClick={agregarUmbral}
          >
            + Agregar umbral de control
          </button>

          {umbralesActuales.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {umbralesActuales.map((u, idx) => (
                <div
                  key={`${u.nombre_dato}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-borde, #334155)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>
                    <strong>{u.nombre_dato}</strong>: {formatearReglaUmbral(u)}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-eliminar"
                    title="Quitar umbral"
                    onClick={() =>
                      setDetalle((prev) => ({
                        ...prev,
                        parametros_control: (prev.parametros_control ?? []).filter(
                          (_, i) => i !== idx
                        ),
                      }))
                    }
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
