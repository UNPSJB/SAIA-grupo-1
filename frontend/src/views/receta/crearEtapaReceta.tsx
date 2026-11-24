import { useEffect, useState } from "react";
import {
  ETAPAS_PREDEFINIDAS,
  formatearReglaUmbral,
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

interface ItemInsumoPaso {
  key: number;
  tipo_insumo_id: number;
  nombre_ingrediente: string;
  cantidad: number;
  unidad_medida: string;
  es_aditivo: boolean;
  clase_funcional: string | null;
  numero_ins: string | null;
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

interface NuevoDetalleRecetaProps {
  etapaInicial?: string;
  etapasExistentes?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
  onAgregarLocal?: (detalle: RecetaDetalleConId) => void;
  onAgregarMultiples?: (detalles: RecetaDetalleConId[]) => void;
}

export default function NuevoDetalleReceta({
  etapaInicial = "",
  etapasExistentes = [],
  onAgregarLocal,
  onAgregarMultiples,
  onSuccess,
  onCancel,
}: NuevoDetalleRecetaProps) {
  const [etapa, setEtapa] = useState<string>(etapaInicial || "Preparación");
  const [etapaPersonalizada, setEtapaPersonalizada] = useState<string>("");
  const [nombrePaso, setNombrePaso] = useState<string>("");
  const [descripcionPasos, setDescripcionPasos] = useState<string>("");

  const [tiposInsumos, setTiposInsumos] = useState<TipoInsumoOption[]>([]);
  const [insumosPaso, setInsumosPaso] = useState<ItemInsumoPaso[]>([]);
  const [esAditivoNuevo, setEsAditivoNuevo] = useState<boolean>(false);
  const [tipoInsumoId, setTipoInsumoId] = useState<number | "">("");
  const [cantidadInsumo, setCantidadInsumo] = useState<string>("");
  const [unidadInsumo, setUnidadInsumo] = useState<string>("");
  const [claseFuncional, setClaseFuncional] = useState<string>("");
  const [numeroIns, setNumeroIns] = useState<string>("");

  const [umbrales, setUmbrales] = useState<ParametroControlReceta[]>([]);
  const [nombreUmbral, setNombreUmbral] = useState<string>("");
  const [unidadUmbral, setUnidadUmbral] = useState<string>("");
  const [condicionUmbral, setCondicionUmbral] = useState<CondicionUmbral>("RANGO");
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");
  const [valorUnico, setValorUnico] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (etapaInicial) {
      setEtapa(etapaInicial);
    }
  }, [etapaInicial]);

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
    new Set([...ETAPAS_PREDEFINIDAS, ...etapasExistentes.filter(Boolean)])
  );

  const tiposFiltrados = tiposInsumos.filter((t) =>
    esAditivoNuevo ? Boolean(t.es_aditivo) : !t.es_aditivo
  );

  const esAromatizante = claseFuncional.toLowerCase().includes("aromatizante");

  function handleCambiarCategoria(esAdit: boolean) {
    setEsAditivoNuevo(esAdit);
    setTipoInsumoId("");
    setUnidadInsumo("");
    setClaseFuncional("");
    setNumeroIns("");
  }

  function handleSeleccionTipo(idStr: string) {
    const idNum = idStr ? Number(idStr) : "";
    setTipoInsumoId(idNum);
    if (idNum !== "") {
      const elegido = tiposInsumos.find((t) => t.id === idNum);
      setUnidadInsumo(obtenerUnidadDeTipo(elegido));
      setClaseFuncional(elegido?.clase_funcional || "");
      setNumeroIns(elegido?.numero_ins || "");
    } else {
      setUnidadInsumo("");
      setClaseFuncional("");
      setNumeroIns("");
    }
  }

  function agregarInsumoAPaso() {
    setErrorMsg(null);
    if (tipoInsumoId === "") {
      setErrorMsg(
        esAditivoNuevo
          ? "Seleccione un aditivo para agregar al paso."
          : "Seleccione un ingrediente para agregar al paso."
      );
      return;
    }
    const cantNum = Number(cantidadInsumo);
    if (!cantidadInsumo || Number.isNaN(cantNum) || cantNum <= 0) {
      setErrorMsg("La cantidad del insumo debe ser mayor a 0.");
      return;
    }
    if (esAditivoNuevo) {
      if (!claseFuncional.trim()) {
        setErrorMsg("El aditivo requiere una clase funcional.");
        return;
      }
      if (!esAromatizante && !numeroIns.trim()) {
        setErrorMsg("El aditivo requiere un número INS.");
        return;
      }
    }
    const elegido = tiposInsumos.find((t) => t.id === Number(tipoInsumoId));
    setInsumosPaso((prev) => [
      ...prev,
      {
        key: Date.now() + prev.length,
        tipo_insumo_id: Number(tipoInsumoId),
        nombre_ingrediente: elegido ? elegido.nombre : `Insumo #${tipoInsumoId}`,
        cantidad: cantNum,
        unidad_medida: unidadInsumo.trim() || "gramos",
        es_aditivo: esAditivoNuevo,
        clase_funcional: esAditivoNuevo ? claseFuncional.trim() : null,
        numero_ins: esAditivoNuevo && numeroIns.trim() ? numeroIns.trim() : null,
      },
    ]);
    setTipoInsumoId("");
    setCantidadInsumo("");
    setUnidadInsumo("");
    setClaseFuncional("");
    setNumeroIns("");
  }

  function agregarUmbralAPaso() {
    setErrorMsg(null);
    const nom = nombreUmbral.trim();
    if (!nom) {
      setErrorMsg("Ingrese el nombre del parámetro de control (ej: Temperatura interna).");
      return;
    }

    let minVal: number | null = null;
    let maxVal: number | null = null;

    if (condicionUmbral === "RANGO") {
      if (valorMin === "" || valorMax === "") {
        setErrorMsg("Para un rango debe indicar valor mínimo y valor máximo.");
        return;
      }
      minVal = Number(valorMin);
      maxVal = Number(valorMax);
      if (Number.isNaN(minVal) || Number.isNaN(maxVal) || minVal > maxVal) {
        setErrorMsg("El valor mínimo no puede ser mayor que el valor máximo.");
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

    setUmbrales((prev) => [
      ...prev,
      {
        nombre_dato: nom,
        unidad_medida: unidadUmbral.trim() || null,
        condicion: condicionUmbral,
        umbral_minimo: minVal,
        umbral_maximo: maxVal,
      },
    ]);

    setNombreUmbral("");
    setUnidadUmbral("");
    setValorMin("");
    setValorMax("");
    setValorUnico("");
  }

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const etapaFinal = (etapa === "__OTRA__" ? etapaPersonalizada : etapa).trim() || "General";
    const nombreLimpio = nombrePaso.trim();
    const descLimpia = descripcionPasos.trim();

    if (nombreLimpio.length < 2) {
      setErrorMsg("El nombre del paso debe tener al menos 2 caracteres.");
      return;
    }
    if (!descLimpia) {
      setErrorMsg("La descripción / procedimiento del paso no puede estar vacía.");
      return;
    }

    const listaInsumosFinal = [...insumosPaso];
    if (tipoInsumoId !== "" && cantidadInsumo !== "" && Number(cantidadInsumo) > 0) {
      if (esAditivoNuevo && !claseFuncional.trim()) {
        setErrorMsg("El aditivo seleccionado requiere una clase funcional.");
        return;
      }
      if (esAditivoNuevo && !esAromatizante && !numeroIns.trim()) {
        setErrorMsg("El aditivo seleccionado requiere un número INS.");
        return;
      }
      const elegido = tiposInsumos.find((t) => t.id === Number(tipoInsumoId));
      listaInsumosFinal.push({
        key: Date.now() + 999,
        tipo_insumo_id: Number(tipoInsumoId),
        nombre_ingrediente: elegido ? elegido.nombre : `Insumo #${tipoInsumoId}`,
        cantidad: Number(cantidadInsumo),
        unidad_medida: unidadInsumo.trim() || "gramos",
        es_aditivo: esAditivoNuevo,
        clase_funcional: esAditivoNuevo ? claseFuncional.trim() : null,
        numero_ins: esAditivoNuevo && numeroIns.trim() ? numeroIns.trim() : null,
      });
    }

    const baseId = Date.now();
    const detallesGenerados: RecetaDetalleConId[] =
      listaInsumosFinal.length > 0
        ? listaInsumosFinal.map((item, idx) => ({
            id: baseId + idx,
            version_receta_id: 0,
            etapa: etapaFinal,
            nombre: nombreLimpio,
            tipo_insumo_id: item.tipo_insumo_id,
            nombre_ingrediente: item.nombre_ingrediente,
            cantidad: item.cantidad,
            unidad_medida: item.unidad_medida,
            es_aditivo: item.es_aditivo,
            clase_funcional: item.clase_funcional,
            numero_ins: item.numero_ins,
            descripcion_pasos: descLimpia,
            parametros_control: idx === 0 ? umbrales : [],
          }))
        : [
            {
              id: baseId,
              version_receta_id: 0,
              etapa: etapaFinal,
              nombre: nombreLimpio,
              tipo_insumo_id: null,
              nombre_ingrediente: null,
              cantidad: 0,
              unidad_medida: "unidades",
              es_aditivo: false,
              clase_funcional: null,
              numero_ins: null,
              descripcion_pasos: descLimpia,
              parametros_control: umbrales,
            },
          ];

    if (onAgregarMultiples) {
      onAgregarMultiples(detallesGenerados);
    } else if (onAgregarLocal) {
      detallesGenerados.forEach((d) => onAgregarLocal(d));
    }

    onSuccess?.();
  }

  return (
    <div
      className="modulo-container formulario-box"
      style={{ maxHeight: "82vh", overflowY: "auto", paddingRight: "8px" }}
    >
      <div className="modulo-header">
        <h1>Nuevo Paso de Receta</h1>
        <div className="subtitulo">Etapa, descripción, insumos y umbrales de control</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="etapa-select">Etapa *</label>
          <select
            id="etapa-select"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
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

        {etapa === "__OTRA__" && (
          <div className="form-group">
            <label htmlFor="etapa-custom">Nombre de la Nueva Etapa *</label>
            <input
              id="etapa-custom"
              type="text"
              placeholder="Ej: Empanado, Envasado, Refrigerado..."
              value={etapaPersonalizada}
              onChange={(e) => setEtapaPersonalizada(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="nombre-paso">Nombre del Paso *</label>
          <input
            id="nombre-paso"
            type="text"
            placeholder="Ej: Mezclado de secos, Horneado inicial, Control de cámara..."
            value={nombrePaso}
            onChange={(e) => setNombrePaso(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="desc-paso">Descripción / Procedimiento *</label>
          <textarea
            id="desc-paso"
            placeholder="Describe las instrucciones a seguir en este paso..."
            value={descripcionPasos}
            onChange={(e) => setDescripcionPasos(e.target.value)}
            rows={3}
            required
          />
        </div>

        <div
          style={{
            border: "1px solid var(--color-borde, #334155)",
            borderRadius: "8px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
            Ingredientes / Aditivos del Paso (opcional, puede agregar varios)
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={!esAditivoNuevo ? "btn-guardar" : "btn-cancelar"}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px" }}
              onClick={() => handleCambiarCategoria(false)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>nutrition</span>
              Ingrediente
            </button>
            <button
              type="button"
              className={esAditivoNuevo ? "btn-guardar" : "btn-cancelar"}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px" }}
              onClick={() => handleCambiarCategoria(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>science</span>
              Aditivo
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: "8px", marginBottom: "8px" }}>
            <select
              value={tipoInsumoId}
              style={{ minWidth: 0 }}
              onChange={(e) => handleSeleccionTipo(e.target.value)}
            >
              <option value="">
                {esAditivoNuevo ? "Seleccione aditivo..." : "Seleccione ingrediente..."}
              </option>
              {tiposFiltrados.map((t) => {
                const u = obtenerUnidadDeTipo(t);
                return (
                  <option key={t.id} value={t.id}>
                    {esAditivoNuevo
                      ? `${t.nombre}${t.clase_funcional ? ` — ${t.clase_funcional}` : ""}${t.numero_ins ? ` (${t.numero_ins})` : ""}${u ? ` [${u}]` : ""}`
                      : `${t.nombre}${u ? ` (${u})` : ""}`}
                  </option>
                );
              })}
            </select>

            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="Cantidad"
              value={cantidadInsumo}
              onChange={(e) => setCantidadInsumo(e.target.value)}
            />

            <input
              type="text"
              placeholder="Unidad"
              value={unidadInsumo}
              disabled
            />
          </div>

          {esAditivoNuevo && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder="Clase funcional (desde catálogo)"
                value={claseFuncional || ""}
                disabled
                readOnly
              />

              <input
                type="text"
                placeholder={esAromatizante ? "INS (No aplica)" : "Número INS (desde catálogo)"}
                value={numeroIns || (tipoInsumoId !== "" ? "No aplica" : "")}
                disabled
                readOnly
              />
            </div>
          )}

          <button
            type="button"
            className="btn-cancelar"
            style={{ width: "100%", marginBottom: insumosPaso.length > 0 ? "10px" : "0" }}
            onClick={agregarInsumoAPaso}
          >
            + Agregar {esAditivoNuevo ? "aditivo" : "ingrediente"} a este paso
          </button>

          {insumosPaso.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {insumosPaso.map((item) => (
                <div
                  key={item.key}
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
                    <strong>{item.nombre_ingrediente}</strong> — {item.cantidad} {item.unidad_medida}
                    {item.es_aditivo && item.clase_funcional
                      ? ` (${item.clase_funcional}${item.numero_ins ? ` · ${item.numero_ins}` : ""})`
                      : ""}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-eliminar"
                    title="Quitar"
                    onClick={() =>
                      setInsumosPaso((prev) => prev.filter((x) => x.key !== item.key))
                    }
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--color-borde, #334155)",
            borderRadius: "8px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
            Umbrales / Controles de Calidad del Paso (opcional)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: "8px", marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="Parámetro (Ej: Temperatura interna, pH, Tiempo)"
              value={nombreUmbral}
              onChange={(e) => setNombreUmbral(e.target.value)}
            />
            <input
              type="text"
              placeholder="Unidad (Ej: °C, min, pH)"
              value={unidadUmbral}
              onChange={(e) => setUnidadUmbral(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(130px, 100%), 1fr))", gap: "8px", marginBottom: "8px" }}>
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
            style={{ width: "100%", marginBottom: umbrales.length > 0 ? "10px" : "0" }}
            onClick={agregarUmbralAPaso}
          >
            + Agregar umbral de control
          </button>

          {umbrales.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {umbrales.map((u, idx) => (
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
                    onClick={() => setUmbrales((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar">
            Guardar Paso
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
