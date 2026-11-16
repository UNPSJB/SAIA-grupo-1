import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type {
  InsumoConId,
  AlimentoReferenciaSARA,
  DatosNutricionalesInsumoResponse,
  FuenteDatosNutricionales,
} from "./tipos";

interface DatosNutricionalesModalProps {
  insumo: InsumoConId;
  abierto: boolean;
  onCerrar: () => void;
  onGuardadoExitoso?: () => void;
}

const CATEGORIAS_SARA = [
  "TODAS",
  "Cereales y derivados",
  "Grasas y aceites",
  "Azúcares y dulces",
  "Lácteos y derivados",
  "Huevos",
  "Aditivos y leudantes",
  "Semillas y frutos secos",
  "Cacao y derivados",
  "Condimentos e ingredientes varios",
  "Bebidas e ingredientes varios",
];

export const DatosNutricionalesModal: React.FC<DatosNutricionalesModalProps> = ({
  insumo,
  abierto,
  onCerrar,
  onGuardadoExitoso,
}) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const [esAditivo, setEsAditivo] = useState<boolean>(false);
  const [fuenteDatos, setFuenteDatos] =
    useState<FuenteDatosNutricionales>("SARA_2");
  const [fuenteDetalle, setFuenteDetalle] = useState<string>("");
  const [alimentoReferenciaId, setAlimentoReferenciaId] = useState<string>("");

  const [energiaKcal, setEnergiaKcal] = useState<string>("");
  const [energiaKj, setEnergiaKj] = useState<string>("");
  const [carbohidratos, setCarbohidratos] = useState<string>("");
  const [azucaresTotales, setAzucaresTotales] = useState<string>("");
  const [azucaresAnadidos, setAzucaresAnadidos] = useState<string>("");
  const [proteinas, setProteinas] = useState<string>("");
  const [grasasTotales, setGrasasTotales] = useState<string>("");
  const [grasasSaturadas, setGrasasSaturadas] = useState<string>("");
  const [grasasTrans, setGrasasTrans] = useState<string>("");
  const [fibraAlimentaria, setFibraAlimentaria] = useState<string>("");
  const [sodioMg, setSodioMg] = useState<string>("");

  const [valoresReferencia, setValoresReferencia] = useState<
    Record<string, number> | null
  >(null);
  const [fechaCarga, setFechaCarga] = useState<string | null>(null);
  const [usuarioCarga, setUsuarioCarga] = useState<string | null>(null);
  const [modificadoManualmente, setModificadoManualmente] =
    useState<boolean>(false);
  const [fechaModificacion, setFechaModificacion] = useState<string | null>(
    null
  );
  const [usuarioModificacion, setUsuarioModificacion] = useState<
    string | null
  >(null);

  const [buscadorSaraAbierto, setBuscadorSaraAbierto] = useState<boolean>(false);
  const [busquedaSara, setBusquedaSara] = useState<string>("");
  const [categoriaSara, setCategoriaSara] = useState<string>("TODAS");
  const [alimentosSara, setAlimentosSara] = useState<AlimentoReferenciaSARA[]>(
    []
  );
  const [cargandoSara, setCargandoSara] = useState<boolean>(false);

  const cargarDatos = async () => {
    setCargando(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const res = await apiFetch(`/insumos/${insumo.id}/nutricion`);
      if (res.ok) {
        const data: DatosNutricionalesInsumoResponse = await res.json();
        setEsAditivo(data.es_aditivo);
        setFuenteDatos(data.fuente_datos || "SARA_2");
        setFuenteDetalle(data.fuente_detalle || "");
        setAlimentoReferenciaId(data.alimento_referencia_id || "");

        setEnergiaKcal(
          data.energia_kcal !== null && data.energia_kcal !== undefined
            ? String(data.energia_kcal)
            : ""
        );
        setEnergiaKj(
          data.energia_kj !== null && data.energia_kj !== undefined
            ? String(data.energia_kj)
            : ""
        );
        setCarbohidratos(
          data.carbohidratos !== null && data.carbohidratos !== undefined
            ? String(data.carbohidratos)
            : ""
        );
        setAzucaresTotales(
          data.azucares_totales !== null && data.azucares_totales !== undefined
            ? String(data.azucares_totales)
            : ""
        );
        setAzucaresAnadidos(
          data.azucares_anadidos !== null &&
            data.azucares_anadidos !== undefined
            ? String(data.azucares_anadidos)
            : ""
        );
        setProteinas(
          data.proteinas !== null && data.proteinas !== undefined
            ? String(data.proteinas)
            : ""
        );
        setGrasasTotales(
          data.grasas_totales !== null && data.grasas_totales !== undefined
            ? String(data.grasas_totales)
            : ""
        );
        setGrasasSaturadas(
          data.grasas_saturadas !== null &&
            data.grasas_saturadas !== undefined
            ? String(data.grasas_saturadas)
            : ""
        );
        setGrasasTrans(
          data.grasas_trans !== null && data.grasas_trans !== undefined
            ? String(data.grasas_trans)
            : ""
        );
        setFibraAlimentaria(
          data.fibra_alimentaria !== null &&
            data.fibra_alimentaria !== undefined
            ? String(data.fibra_alimentaria)
            : ""
        );
        setSodioMg(
          data.sodio_mg !== null && data.sodio_mg !== undefined
            ? String(data.sodio_mg)
            : ""
        );

        setValoresReferencia(data.valores_referencia);
        setFechaCarga(data.fecha_carga_nutricional);
        setUsuarioCarga(data.usuario_carga_nutricional);
        setModificadoManualmente(data.modificado_manualmente);
        setFechaModificacion(data.fecha_modificacion_nutricional);
        setUsuarioModificacion(data.usuario_modificacion_nutricional);
      }
    } catch {
      setErrorMsg("Error de conexión al obtener datos nutricionales.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto) {
      cargarDatos();
    }
  }, [insumo.id, abierto]);

  const ejecutarBusquedaSara = async () => {
    setCargandoSara(true);
    try {
      const params = new URLSearchParams();
      if (busquedaSara.trim()) params.append("busqueda", busquedaSara.trim());
      if (categoriaSara && categoriaSara !== "TODAS")
        params.append("categoria", categoriaSara);

      const res = await apiFetch(
        `/insumos/referencia-sara?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAlimentosSara(data);
      }
    } catch {
      return;
    } finally {
      setCargandoSara(false);
    }
  };

  useEffect(() => {
    if (buscadorSaraAbierto) {
      ejecutarBusquedaSara();
    }
  }, [buscadorSaraAbierto, categoriaSara]);

  const seleccionarAlimentoSara = (item: AlimentoReferenciaSARA) => {
    setFuenteDatos("SARA_2");
    setAlimentoReferenciaId(item.codigo);
    setFuenteDetalle(`${item.nombre} (${item.codigo})`);
    setEsAditivo(item.es_aditivo);

    setEnergiaKcal(String(item.energia_kcal));
    setEnergiaKj(String(item.energia_kj));
    setCarbohidratos(String(item.carbohidratos));
    setAzucaresTotales(String(item.azucares_totales));
    setAzucaresAnadidos(String(item.azucares_anadidos));
    setProteinas(String(item.proteinas));
    setGrasasTotales(String(item.grasas_totales));
    setGrasasSaturadas(String(item.grasas_saturadas));
    setGrasasTrans(String(item.grasas_trans));
    setFibraAlimentaria(String(item.fibra_alimentaria));
    setSodioMg(String(item.sodio_mg));

    setValoresReferencia({
      energia_kcal: item.energia_kcal,
      energia_kj: item.energia_kj,
      carbohidratos: item.carbohidratos,
      azucares_totales: item.azucares_totales,
      azucares_anadidos: item.azucares_anadidos,
      proteinas: item.proteinas,
      grasas_totales: item.grasas_totales,
      grasas_saturadas: item.grasas_saturadas,
      grasas_trans: item.grasas_trans,
      fibra_alimentaria: item.fibra_alimentaria,
      sodio_mg: item.sodio_mg,
    });

    setModificadoManualmente(false);
    setBuscadorSaraAbierto(false);
    setExitoMsg(
      `Se importaron con éxito los datos de SARA 2: ${item.nombre}.`
    );
  };

  const restablecerValoresSara = () => {
    if (!valoresReferencia) return;
    setEnergiaKcal(String(valoresReferencia.energia_kcal ?? ""));
    setEnergiaKj(String(valoresReferencia.energia_kj ?? ""));
    setCarbohidratos(String(valoresReferencia.carbohidratos ?? ""));
    setAzucaresTotales(String(valoresReferencia.azucares_totales ?? ""));
    setAzucaresAnadidos(String(valoresReferencia.azucares_anadidos ?? ""));
    setProteinas(String(valoresReferencia.proteinas ?? ""));
    setGrasasTotales(String(valoresReferencia.grasas_totales ?? ""));
    setGrasasSaturadas(String(valoresReferencia.grasas_saturadas ?? ""));
    setGrasasTrans(String(valoresReferencia.grasas_trans ?? ""));
    setFibraAlimentaria(String(valoresReferencia.fibra_alimentaria ?? ""));
    setSodioMg(String(valoresReferencia.sodio_mg ?? ""));
    setModificadoManualmente(false);
    setExitoMsg("Se restablecieron los valores originales de la base SARA 2.");
  };

  const handleEnergiaKcalChange = (valStr: string) => {
    setEnergiaKcal(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0) {
      setEnergiaKj(String(Math.round(num * 4.184 * 10) / 10));
    }
  };

  const esCampoModificado = (
    nombreCampo: string,
    valorActualStr: string
  ): boolean => {
    if (fuenteDatos !== "SARA_2" || !valoresReferencia) return false;
    const refVal = valoresReferencia[nombreCampo];
    if (refVal === undefined || refVal === null) return false;
    const actVal = parseFloat(valorActualStr);
    if (isNaN(actVal)) return true;
    return Math.abs(actVal - refVal) > 0.001;
  };

  const guardarNutricion = async () => {
    setErrorMsg(null);
    setExitoMsg(null);

    const parseOpcional = (v: string): number | null => {
      if (v === "" || v === null || v === undefined) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    const kcal = parseOpcional(energiaKcal);
    const kj = parseOpcional(energiaKj);
    const ch = parseOpcional(carbohidratos);
    const azTot = parseOpcional(azucaresTotales);
    const azAnad = parseOpcional(azucaresAnadidos);
    const prot = parseOpcional(proteinas);
    const grTot = parseOpcional(grasasTotales);
    const grSat = parseOpcional(grasasSaturadas);
    const grTrans = parseOpcional(grasasTrans);
    const fibra = parseOpcional(fibraAlimentaria);
    const na = parseOpcional(sodioMg);

    const todos = [
      kcal,
      kj,
      ch,
      azTot,
      azAnad,
      prot,
      grTot,
      grSat,
      grTrans,
      fibra,
      na,
    ];
    if (todos.some((x) => x !== null && x < 0)) {
      setErrorMsg("Los valores nutricionales no pueden ser números negativos.");
      return;
    }

    if (!fuenteDatos) {
      setErrorMsg(
        "Debe seleccionar una fuente válida para los datos nutricionales."
      );
      return;
    }

    if (!esAditivo) {
      if (
        kcal === null ||
        ch === null ||
        prot === null ||
        grTot === null ||
        na === null
      ) {
        setErrorMsg(
          "Para insumos convencionales, debe completar los datos obligatorios (Energía, Carbohidratos, Proteínas, Grasas totales y Sodio)."
        );
        return;
      }
    }

    setGuardando(true);
    try {
      const payload = {
        es_aditivo: esAditivo,
        fuente_datos: fuenteDatos,
        fuente_detalle: fuenteDetalle.trim() || null,
        alimento_referencia_id: alimentoReferenciaId.trim() || null,
        energia_kcal: kcal,
        energia_kj: kj,
        carbohidratos: ch,
        azucares_totales: azTot,
        azucares_anadidos: azAnad,
        proteinas: prot,
        grasas_totales: grTot,
        grasas_saturadas: grSat,
        grasas_trans: grTrans,
        fibra_alimentaria: fibra,
        sodio_mg: na,
      };

      const res = await apiFetch(`/insumos/${insumo.id}/nutricion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: DatosNutricionalesInsumoResponse = await res.json();
        setModificadoManualmente(data.modificado_manualmente);
        setFechaModificacion(data.fecha_modificacion_nutricional);
        setUsuarioModificacion(data.usuario_modificacion_nutricional);
        setFechaCarga(data.fecha_carga_nutricional);
        setUsuarioCarga(data.usuario_carga_nutricional);
        setValoresReferencia(data.valores_referencia);
        setExitoMsg(
          "¡Información nutricional guardada correctamente por cada 100 g!"
        );
        onGuardadoExitoso?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(
          err.detail || "No se pudo guardar la información nutricional."
        );
      }
    } catch {
      setErrorMsg("Error de conexión al guardar los datos nutricionales.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent
        style={{
          maxWidth: "880px",
          width: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 28px",
          backgroundColor: "var(--color-superficie)",
          color: "var(--color-texto)",
          border: "1px solid var(--color-borde)",
          borderRadius: "12px",
        }}
      >
        <DialogHeader style={{ borderBottom: "1px solid var(--color-borde)", paddingBottom: "14px", marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "26px", color: "var(--color-texto)" }}>
                  monitoring
                </span>
                <DialogTitle style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>
                  Datos Nutricionales por 100 g
                </DialogTitle>
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--color-texto-sec)", marginTop: "4px" }}>
                Insumo: <strong style={{ color: "var(--color-texto)" }}>{insumo.nombre}</strong> (Lote: {insumo.lote})
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {esAditivo ? (
                <Badge variant="secondary" style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                  Aditivo alimentario
                </Badge>
              ) : (
                <Badge variant="outline" style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                  Ingrediente base
                </Badge>
              )}

              {fuenteDatos === "SARA_2" && modificadoManualmente && (
                <Badge variant="proximo" style={{ fontSize: "0.8rem", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    edit
                  </span>
                  <span>Modificado respecto a SARA 2</span>
                </Badge>
              )}

              {fuenteDatos === "SARA_2" && !modificadoManualmente && fechaCarga && (
                <Badge variant="activo" style={{ fontSize: "0.8rem", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    verified
                  </span>
                  <span>Coincide con SARA 2</span>
                </Badge>
              )}

              {fuenteDatos === "ROTULO_PROVEEDOR" && fechaCarga && (
                <Badge variant="secondary" style={{ fontSize: "0.8rem", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    receipt_long
                  </span>
                  <span>Rótulo proveedor</span>
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {exitoMsg && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: "#059669",
              borderRadius: "8px",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontWeight: 500,
              fontSize: "0.9rem",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              check_circle
            </span>
            <span>{exitoMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              fontWeight: 500,
              fontSize: "0.9rem",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              error
            </span>
            <span>{errorMsg}</span>
          </div>
        )}

        {cargando ? (
          <div style={{ textAlign: "center", padding: "3rem", fontSize: "0.95rem" }}>
            Cargando información nutricional...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Card style={{ border: "1px solid var(--color-borde)" }}>
              <CardContent style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    id="chk-es-aditivo"
                    type="checkbox"
                    checked={esAditivo}
                    onChange={(e) => setEsAditivo(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="chk-es-aditivo" style={{ fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}>
                    Este insumo es un aditivo alimentario (leudante, conservante, emulsionante, colorante, aromatizante, etc.)
                  </label>
                </div>

                {esAditivo && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 14px",
                      background: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      lineHeight: "1.45",
                      color: "var(--color-texto)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#3b82f6", flexShrink: 0, marginTop: "2px" }}>
                      info
                    </span>
                    <div>
                      <strong>Normativa CAA:</strong> No se exige información nutricional completa a los aditivos por defecto. Puede cargar de forma opcional su aporte de energía y sodio cuando sea relevante tecnológicamente (ej. leudantes químicos con aporte de sodio o aromatizantes en base calórica).
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card style={{ border: "1px solid var(--color-borde)" }}>
              <CardHeader style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-borde)" }}>
                <CardTitle style={{ fontSize: "1rem", fontWeight: 700 }}>
                  Fuente de los Datos Nutricionales
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { id: "SARA_2", label: "Base SARA 2 (Oficial)", icon: "database" },
                    { id: "ROTULO_PROVEEDOR", label: "Rótulo del Proveedor", icon: "receipt_long" },
                    { id: "OTRA_BIBLIOGRAFIA", label: "Otra Bibliografía", icon: "menu_book" },
                    { id: "VALOR_PROPIO", label: "Valor Propio / Análisis", icon: "science" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFuenteDatos(f.id as FuenteDatosNutricionales)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor:
                          fuenteDatos === f.id ? "var(--color-texto)" : "var(--color-borde)",
                        backgroundColor:
                          fuenteDatos === f.id ? "var(--color-texto)" : "transparent",
                        color:
                          fuenteDatos === f.id
                            ? "var(--color-superficie)"
                            : "var(--color-texto)",
                        cursor: "pointer",
                        fontWeight: fuenteDatos === f.id ? 600 : 400,
                        fontSize: "0.88rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
                        {f.icon}
                      </span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>

                {fuenteDatos === "SARA_2" && (
                  <div
                    style={{
                      padding: "14px 16px",
                      backgroundColor: "var(--color-fondo)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-borde)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {alimentoReferenciaId
                          ? `Alimento SARA seleccionado: ${fuenteDetalle || alimentoReferenciaId}`
                          : "Ningún alimento de referencia importado aún"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-texto-sec)", marginTop: "2px" }}>
                        Base de composición de alimentos del Ministerio de Salud de la Nación / Argenfoods
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-secundario"
                        onClick={() => {
                          setBusquedaSara(insumo.nombre);
                          setBuscadorSaraAbierto(true);
                        }}
                        style={{ fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          search
                        </span>
                        <span>Buscar en SARA 2</span>
                      </button>
                      {valoresReferencia && modificadoManualmente && (
                        <button
                          type="button"
                          className="btn-cancelar"
                          onClick={restablecerValoresSara}
                          style={{ fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            restart_alt
                          </span>
                          <span>Restablecer a SARA</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {fuenteDatos !== "SARA_2" && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="fuenteDetalle" style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "4px" }}>
                      Detalle de la fuente (lote, certificado, bibliografía o laboratorio):
                    </label>
                    <input
                      id="fuenteDetalle"
                      type="text"
                      value={fuenteDetalle}
                      onChange={(e) => setFuenteDetalle(e.target.value)}
                      placeholder="Ej. Rótulo proveedor Lote 2026-B, Certificado de Calidad Nº 4521..."
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.9rem",
                        borderRadius: "6px",
                        border: "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card style={{ border: "1px solid var(--color-borde)" }}>
              <CardHeader style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-borde)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <CardTitle style={{ fontSize: "1rem", fontWeight: 700 }}>
                    Valores Nutricionales por cada 100 gramos
                  </CardTitle>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-texto-sec)" }}>
                    {esAditivo ? "Carga opcional para aditivos" : "Obligatorio para alimentos"}
                  </span>
                </div>
              </CardHeader>
              <CardContent style={{ padding: "20px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="energiaKcal" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Valor Energético (kcal)
                      {esCampoModificado("energia_kcal", energiaKcal) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.energia_kcal})
                        </span>
                      )}
                    </label>
                    <input
                      id="energiaKcal"
                      type="number"
                      step="0.1"
                      min="0"
                      value={energiaKcal}
                      onChange={(e) => handleEnergiaKcalChange(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("energia_kcal", energiaKcal)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="energiaKj" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Valor Energético (kJ)
                      {esCampoModificado("energia_kj", energiaKj) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.energia_kj})
                        </span>
                      )}
                    </label>
                    <input
                      id="energiaKj"
                      type="number"
                      step="0.1"
                      min="0"
                      value={energiaKj}
                      onChange={(e) => setEnergiaKj(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("energia_kj", energiaKj)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="sodioMg" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Sodio (mg)
                      {esCampoModificado("sodio_mg", sodioMg) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.sodio_mg})
                        </span>
                      )}
                    </label>
                    <input
                      id="sodioMg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={sodioMg}
                      onChange={(e) => setSodioMg(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("sodio_mg", sodioMg)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="carbohidratos" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Carbohidratos totales (g)
                      {esCampoModificado("carbohidratos", carbohidratos) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.carbohidratos})
                        </span>
                      )}
                    </label>
                    <input
                      id="carbohidratos"
                      type="number"
                      step="0.1"
                      min="0"
                      value={carbohidratos}
                      onChange={(e) => setCarbohidratos(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("carbohidratos", carbohidratos)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="azucaresTotales" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Azúcares totales (g)
                      {esCampoModificado("azucares_totales", azucaresTotales) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.azucares_totales})
                        </span>
                      )}
                    </label>
                    <input
                      id="azucaresTotales"
                      type="number"
                      step="0.1"
                      min="0"
                      value={azucaresTotales}
                      onChange={(e) => setAzucaresTotales(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("azucares_totales", azucaresTotales)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="azucaresAnadidos" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Azúcares añadidos (g)
                      {esCampoModificado("azucares_anadidos", azucaresAnadidos) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.azucares_anadidos})
                        </span>
                      )}
                    </label>
                    <input
                      id="azucaresAnadidos"
                      type="number"
                      step="0.1"
                      min="0"
                      value={azucaresAnadidos}
                      onChange={(e) => setAzucaresAnadidos(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("azucares_anadidos", azucaresAnadidos)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="proteinas" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Proteínas (g)
                      {esCampoModificado("proteinas", proteinas) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.proteinas})
                        </span>
                      )}
                    </label>
                    <input
                      id="proteinas"
                      type="number"
                      step="0.1"
                      min="0"
                      value={proteinas}
                      onChange={(e) => setProteinas(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("proteinas", proteinas)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="grasasTotales" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Grasas totales (g)
                      {esCampoModificado("grasas_totales", grasasTotales) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.grasas_totales})
                        </span>
                      )}
                    </label>
                    <input
                      id="grasasTotales"
                      type="number"
                      step="0.1"
                      min="0"
                      value={grasasTotales}
                      onChange={(e) => setGrasasTotales(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("grasas_totales", grasasTotales)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="grasasSaturadas" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Grasas saturadas (g)
                      {esCampoModificado("grasas_saturadas", grasasSaturadas) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.grasas_saturadas})
                        </span>
                      )}
                    </label>
                    <input
                      id="grasasSaturadas"
                      type="number"
                      step="0.1"
                      min="0"
                      value={grasasSaturadas}
                      onChange={(e) => setGrasasSaturadas(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("grasas_saturadas", grasasSaturadas)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="grasasTrans" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Grasas trans (g)
                      {esCampoModificado("grasas_trans", grasasTrans) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.grasas_trans})
                        </span>
                      )}
                    </label>
                    <input
                      id="grasasTrans"
                      type="number"
                      step="0.1"
                      min="0"
                      value={grasasTrans}
                      onChange={(e) => setGrasasTrans(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("grasas_trans", grasasTrans)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="fibraAlimentaria" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Fibra alimentaria (g)
                      {esCampoModificado("fibra_alimentaria", fibraAlimentaria) && (
                        <span style={{ color: "#d97706", fontSize: "0.75rem", marginLeft: "6px" }}>
                          (SARA: {valoresReferencia?.fibra_alimentaria})
                        </span>
                      )}
                    </label>
                    <input
                      id="fibraAlimentaria"
                      type="number"
                      step="0.1"
                      min="0"
                      value={fibraAlimentaria}
                      onChange={(e) => setFibraAlimentaria(e.target.value)}
                      placeholder="0.0"
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.92rem",
                        borderRadius: "6px",
                        border: esCampoModificado("fibra_alimentaria", fibraAlimentaria)
                          ? "1px solid #f59e0b"
                          : "1px solid var(--color-borde)",
                        backgroundColor: "var(--color-superficie)",
                        color: "var(--color-texto)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {(fechaCarga || fechaModificacion) && (
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-fondo)",
                  border: "1px solid var(--color-borde)",
                  fontSize: "0.82rem",
                  color: "var(--color-texto-sec)",
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {fechaCarga && (
                  <div>
                    Cargado por <strong>{usuarioCarga || "Administrador"}</strong> el{" "}
                    {new Date(fechaCarga).toLocaleString()}
                  </div>
                )}
                {fechaModificacion && (
                  <div>
                    Modificado por <strong>{usuarioModificacion || "Administrador"}</strong> el{" "}
                    {new Date(fechaModificacion).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            className="btn-cancelar"
            onClick={onCerrar}
            disabled={guardando}
            style={{ fontSize: "0.92rem", padding: "8px 18px" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-guardar"
            onClick={guardarNutricion}
            disabled={guardando || cargando}
            style={{ fontSize: "0.92rem", padding: "8px 22px" }}
          >
            {guardando ? "Guardando..." : "Guardar datos nutricionales"}
          </button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={buscadorSaraAbierto} onOpenChange={setBuscadorSaraAbierto}>
        <DialogContent
          style={{
            maxWidth: "750px",
            width: "90vw",
            maxHeight: "85vh",
            overflowY: "auto",
            backgroundColor: "var(--color-superficie)",
            color: "var(--color-texto)",
            border: "1px solid var(--color-borde)",
            borderRadius: "12px",
            padding: "20px 24px",
          }}
        >
          <DialogHeader style={{ borderBottom: "1px solid var(--color-borde)", paddingBottom: "12px", marginBottom: "14px" }}>
            <DialogTitle style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              Buscador en la Base de Composición SARA 2
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={busquedaSara}
              onChange={(e) => setBusquedaSara(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ejecutarBusquedaSara()}
              placeholder="Buscar por nombre o código (ej. harina, aceite, huevo, leche...)"
              style={{
                flex: "1 1 250px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid var(--color-borde)",
                backgroundColor: "var(--color-fondo)",
                color: "var(--color-texto)",
                fontSize: "0.9rem",
              }}
            />

            <select
              value={categoriaSara}
              onChange={(e) => setCategoriaSara(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--color-borde)",
                backgroundColor: "var(--color-fondo)",
                color: "var(--color-texto)",
                fontSize: "0.9rem",
              }}
            >
              {CATEGORIAS_SARA.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-guardar"
              onClick={ejecutarBusquedaSara}
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
            >
              Buscar
            </button>
          </div>

          {cargandoSara ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-texto-sec)" }}>
              Buscando en base de referencia...
            </div>
          ) : alimentosSara.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-texto-sec)" }}>
              No se encontraron alimentos en SARA 2 con los criterios indicados.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alimentosSara.map((item) => (
                <div
                  key={item.codigo}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-borde)",
                    backgroundColor: "var(--color-fondo)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{item.nombre}</strong>
                      <Badge variant="outline" style={{ fontSize: "0.72rem" }}>
                        {item.codigo}
                      </Badge>
                      {item.es_aditivo && (
                        <Badge variant="secondary" style={{ fontSize: "0.72rem" }}>
                          Aditivo
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-texto-sec)", marginTop: "3px" }}>
                      {item.categoria} · {item.energia_kcal} kcal / 100g · Carbohidratos: {item.carbohidratos}g · Proteínas: {item.proteinas}g · Grasas: {item.grasas_totales}g · Sodio: {item.sodio_mg}mg
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => seleccionarAlimentoSara(item)}
                    style={{ fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      download
                    </span>
                    <span>Importar valores</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => setBuscadorSaraAbierto(false)}
            >
              Cerrar buscador
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
