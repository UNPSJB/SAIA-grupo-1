import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  ConfirmAlertDialog,
  ErrorAlertDialog,
} from "../../components/ui/alert-dialog";
import type {
  FormatoDeclaracionAditivos,
  ItemIngrediente,
  ListaIngredientesRotuloResponse,
} from "./tiposRotulado";
import "../../styles/formularioAlta.css";

interface OrdenarIngredientesProps {
  productoId: number;
  onVolver: () => void;
  onPrevisualizarBorrador?: () => void;
}

const FUNCIONES_COMUNES = [
  "Conservante",
  "Emulsionante",
  "Acidulante",
  "Colorante",
  "Estabilizante",
  "Antioxidante",
  "Aromatizante / Saborizante",
  "Leudante químico",
  "Espesante",
  "Humectante",
  "Regulador de acidez",
];

export const OrdenarIngredientes: React.FC<OrdenarIngredientesProps> = ({
  productoId,
  onVolver,
  onPrevisualizarBorrador,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [productoNombre, setProductoNombre] = useState<string>("");
  const [formato, setFormato] =
    useState<FormatoDeclaracionAditivos>("ins_y_nombre");
  const [items, setItems] = useState<ItemIngrediente[]>([]);
  const [ajustadoManualmente, setAjustadoManualmente] =
    useState<boolean>(false);
  const [fechaAjuste, setFechaAjuste] = useState<string | null>(null);
  const [usuarioAjuste, setUsuarioAjuste] = useState<string | null>(null);
  const [textoRotulo, setTextoRotulo] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null);
  const [formNombre, setFormNombre] = useState<string>("");
  const [formDenominacion, setFormDenominacion] = useState<string>("");
  const [formPorcentaje, setFormPorcentaje] = useState<string>("");
  const [formEsAditivo, setFormEsAditivo] = useState<boolean>(false);
  const [formFuncion, setFormFuncion] = useState<string>("");
  const [formIns, setFormIns] = useState<string>("");
  const [formEsAroma, setFormEsAroma] = useState<boolean>(false);

  const [dialogResetAbierto, setDialogResetAbierto] = useState<boolean>(false);
  const [dialogImportarAbierto, setDialogImportarAbierto] =
    useState<boolean>(false);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const prodRes = await apiFetch(`/productos/${productoId}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProductoNombre(prodData.nombre);
      }

      const res = await apiFetch(
        `/productos/${productoId}/ingredientes-rotulo`
      );
      if (res.ok) {
        const data: ListaIngredientesRotuloResponse = await res.json();
        setFormato(data.formato_aditivos);
        setItems(data.items);
        setAjustadoManualmente(data.ajustado_manualmente);
        setFechaAjuste(data.fecha_ajuste_manual || null);
        setUsuarioAjuste(data.usuario_ajuste_manual || null);
        setTextoRotulo(data.texto_rotulo || "");
      } else if (res.status === 404) {
        setItems([]);
        setTextoRotulo("");
        setAjustadoManualmente(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(
          err.detail || "No se pudo cargar la lista de ingredientes."
        );
      }
    } catch {
      setErrorMsg("Error de conexión al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [productoId]);

  const previsualizar = async (
    itemsActuales: ItemIngrediente[],
    formatoActual: FormatoDeclaracionAditivos
  ) => {
    if (itemsActuales.length === 0) {
      setTextoRotulo("");
      return;
    }
    try {
      const res = await apiFetch(
        `/productos/${productoId}/ingredientes-rotulo/previsualizar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formato_aditivos: formatoActual,
            items: itemsActuales.map((it) => ({
              nombre: it.nombre,
              denominacion_rotulo: it.denominacion_rotulo || it.nombre,
              porcentaje: it.porcentaje,
              es_aditivo: it.es_aditivo,
              funcion: it.funcion || null,
              numero_ins: it.numero_ins || null,
              es_aromatizante: it.es_aromatizante || false,
            })),
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTextoRotulo(data.texto_rotulo);
        if (!ajustadoManualmente) {
          setItems(data.items);
        }
      }
    } catch {
      return;
    }
  };

  const cambiarFormatoAditivos = async (
    nuevoFormato: FormatoDeclaracionAditivos
  ) => {
    setFormato(nuevoFormato);
    const itemsActualizados = items.map((it) => {
      let dec = it.denominacion_rotulo || it.nombre;
      if (it.es_aditivo) {
        const esAroma =
          it.es_aromatizante ||
          (it.funcion || "").toLowerCase().includes("aroma") ||
          (it.funcion || "").toLowerCase().includes("saboriz");
        if (esAroma) {
          dec = it.funcion || "Aromatizante";
        } else {
          const func = it.funcion || "Aditivo";
          const nom = it.denominacion_rotulo || it.nombre;
          const ins = it.numero_ins;
          if (!ins) {
            dec = `${func} (${nom})`;
          } else if (nuevoFormato === "solo_ins") {
            dec = `${func} (INS ${ins})`;
          } else if (nuevoFormato === "solo_nombre") {
            dec = `${func} (${nom})`;
          } else if (nuevoFormato === "nombre_e_ins") {
            dec = `${func} (${nom}, INS ${ins})`;
          } else {
            dec = `${func} (INS ${ins} - ${nom})`;
          }
        }
      }
      return { ...it, texto_declaracion: dec };
    });
    setItems(itemsActualizados);
    if (itemsActualizados.length > 0) {
      const decs = itemsActualizados.map((i) => i.texto_declaracion);
      setTextoRotulo(`INGREDIENTES: ${decs.join(", ")}.`);
    }
  };

  const moverItem = (indice: number, direccion: "arriba" | "abajo") => {
    if (
      (direccion === "arriba" && indice === 0) ||
      (direccion === "abajo" && indice === items.length - 1)
    ) {
      return;
    }
    const nuevoIndice = direccion === "arriba" ? indice - 1 : indice + 1;
    const copia = [...items];
    const [movido] = copia.splice(indice, 1);
    copia.splice(nuevoIndice, 0, movido);

    const actualizados = copia.map((it, idx) => ({ ...it, orden: idx + 1 }));
    setItems(actualizados);
    setAjustadoManualmente(true);
    const decs = actualizados.map((i) => i.texto_declaracion);
    setTextoRotulo(`INGREDIENTES: ${decs.join(", ")}.`);
  };

  const eliminarItem = (indice: number) => {
    const filtrados = items.filter((_, idx) => idx !== indice);
    const actualizados = filtrados.map((it, idx) => ({
      ...it,
      orden: idx + 1,
    }));
    setItems(actualizados);
    setAjustadoManualmente(true);
    if (actualizados.length === 0) {
      setTextoRotulo("");
    } else {
      const decs = actualizados.map((i) => i.texto_declaracion);
      setTextoRotulo(`INGREDIENTES: ${decs.join(", ")}.`);
    }
  };

  const abrirModalNuevo = () => {
    setIndiceEdicion(null);
    setFormNombre("");
    setFormDenominacion("");
    setFormPorcentaje("");
    setFormEsAditivo(false);
    setFormFuncion("");
    setFormIns("");
    setFormEsAroma(false);
    setModalAbierto(true);
  };

  const abrirModalEditar = (indice: number) => {
    const it = items[indice];
    setIndiceEdicion(indice);
    setFormNombre(it.nombre);
    setFormDenominacion(it.denominacion_rotulo || it.nombre);
    setFormPorcentaje(it.porcentaje.toString());
    setFormEsAditivo(it.es_aditivo);
    setFormFuncion(it.funcion || "");
    setFormIns(it.numero_ins || "");
    setFormEsAroma(it.es_aromatizante || false);
    setModalAbierto(true);
  };

  const guardarModalItem = () => {
    const pct = parseFloat(formPorcentaje);
    if (!formNombre.trim()) {
      setErrorMsg("El nombre del ingrediente o aditivo es obligatorio.");
      return;
    }
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setErrorMsg("El porcentaje debe ser un número entre 0 y 100.");
      return;
    }
    if (formEsAditivo && !formFuncion.trim() && !formEsAroma) {
      setErrorMsg("Debe especificar una función para el aditivo.");
      return;
    }

    const esAromaFinal =
      formEsAroma ||
      formFuncion.toLowerCase().includes("aroma") ||
      formFuncion.toLowerCase().includes("saboriz");

    let dec = formDenominacion.trim() || formNombre.trim();
    if (formEsAditivo) {
      if (esAromaFinal) {
        dec = formFuncion.trim() || "Aromatizante";
      } else {
        const func = formFuncion.trim() || "Aditivo";
        const nom = formDenominacion.trim() || formNombre.trim();
        const ins = formIns.trim();
        if (!ins) {
          dec = `${func} (${nom})`;
        } else if (formato === "solo_ins") {
          dec = `${func} (INS ${ins})`;
        } else if (formato === "solo_nombre") {
          dec = `${func} (${nom})`;
        } else if (formato === "nombre_e_ins") {
          dec = `${func} (${nom}, INS ${ins})`;
        } else {
          dec = `${func} (INS ${ins} - ${nom})`;
        }
      }
    }

    const nuevoItem: ItemIngrediente = {
      nombre: formNombre.trim(),
      denominacion_rotulo: formDenominacion.trim() || formNombre.trim(),
      porcentaje: pct,
      es_aditivo: formEsAditivo,
      funcion: formEsAditivo ? formFuncion.trim() || null : null,
      numero_ins: formEsAditivo ? formIns.trim() || null : null,
      es_aromatizante: esAromaFinal,
      texto_declaracion: dec,
    };

    let copia: ItemIngrediente[];
    if (indiceEdicion !== null) {
      copia = [...items];
      copia[indiceEdicion] = nuevoItem;
    } else {
      copia = [...items, nuevoItem];
    }

    setModalAbierto(false);

    if (!ajustadoManualmente) {
      previsualizar(copia, formato);
    } else {
      const actualizados = copia.map((it, idx) => ({ ...it, orden: idx + 1 }));
      setItems(actualizados);
      const decs = actualizados.map((i) => i.texto_declaracion);
      setTextoRotulo(`INGREDIENTES: ${decs.join(", ")}.`);
    }
  };

  const ejecutarRestablecerAutomatico = async () => {
    setDialogResetAbierto(false);
    setLoading(true);
    try {
      const res = await apiFetch(
        `/productos/${productoId}/ingredientes-rotulo/previsualizar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formato_aditivos: formato,
            items: items.map((it) => ({
              nombre: it.nombre,
              denominacion_rotulo: it.denominacion_rotulo || it.nombre,
              porcentaje: it.porcentaje,
              es_aditivo: it.es_aditivo,
              funcion: it.funcion || null,
              numero_ins: it.numero_ins || null,
              es_aromatizante: it.es_aromatizante || false,
            })),
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTextoRotulo(data.texto_rotulo);
        setAjustadoManualmente(false);
        setFechaAjuste(null);
        setUsuarioAjuste(null);
        setExitoMsg("Se restableció el orden automático según proporción.");
      }
    } catch {
      setErrorMsg("Error al restablecer el orden automático.");
    } finally {
      setLoading(false);
    }
  };

  const ejecutarImportarLote = async () => {
    setDialogImportarAbierto(false);
    setLoading(true);
    try {
      const res = await apiFetch(
        `/productos/${productoId}/ingredientes-rotulo/importar-lote`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTextoRotulo(data.texto_rotulo);
        setAjustadoManualmente(false);
        setExitoMsg(
          "Se cargaron e identificaron los insumos del último lote de producción."
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(
          err.detail || "No hay lotes con insumos disponibles para importar."
        );
      }
    } catch {
      setErrorMsg("Error de conexión al importar lote.");
    } finally {
      setLoading(false);
    }
  };

  const guardarListaCompleta = async () => {
    if (items.length === 0) {
      setErrorMsg("La lista no puede estar vacía.");
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const res = await apiFetch(
        `/productos/${productoId}/ingredientes-rotulo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formato_aditivos: formato,
            ajustado_manualmente: ajustadoManualmente,
            items: items.map((it) => ({
              nombre: it.nombre,
              denominacion_rotulo: it.denominacion_rotulo || it.nombre,
              porcentaje: it.porcentaje,
              es_aditivo: it.es_aditivo,
              funcion: it.funcion || null,
              numero_ins: it.numero_ins || null,
              es_aromatizante: it.es_aromatizante || false,
            })),
          }),
        }
      );
      if (res.ok) {
        const data: ListaIngredientesRotuloResponse = await res.json();
        setItems(data.items);
        setFormato(data.formato_aditivos);
        setAjustadoManualmente(data.ajustado_manualmente);
        setFechaAjuste(data.fecha_ajuste_manual || null);
        setUsuarioAjuste(data.usuario_ajuste_manual || null);
        setTextoRotulo(data.texto_rotulo || "");
        setExitoMsg(
          "¡Lista guardada con éxito! Ya está disponible para el rotulado del producto."
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "No se pudo guardar la lista de ingredientes.");
      }
    } catch {
      setErrorMsg("Error de conexión al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "100%",
        width: "100%",
        padding: "0",
        margin: "0 0 3.5rem 0",
        boxSizing: "border-box",
      }}
    >
      <div className="listado-top-bar" style={{ marginBottom: "24px" }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: "2.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Ordenar Lista de Ingredientes y Aditivos
          </h1>
          <div className="subtitulo" style={{ fontSize: "1rem", marginTop: "4px" }}>
            {productoNombre
              ? `${productoNombre} (Producto #${productoId})`
              : `Producto #${productoId}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-cancelar"
            onClick={onVolver}
            style={{ fontSize: "0.95rem", padding: "10px 18px" }}
          >
            Volver al producto
          </button>
          {onPrevisualizarBorrador && (
            <button
              type="button"
              className="btn-secundario"
              onClick={onPrevisualizarBorrador}
              style={{
                fontSize: "0.95rem",
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                label
              </span>
              <span>Previsualizar Rótulo</span>
            </button>
          )}
          <button
            type="button"
            className="btn-guardar"
            disabled={guardando || items.length === 0}
            onClick={guardarListaCompleta}
            style={{ fontSize: "0.95rem", padding: "10px 22px" }}
          >
            {guardando ? "Guardando..." : "Guardar para el rótulo"}
          </button>
        </div>
      </div>

      {exitoMsg && (
        <div
          className="alerta-exito"
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            color: "#059669",
            borderRadius: "8px",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          {exitoMsg}
        </div>
      )}

      {errorMsg && (
        <div
          className="alerta-error"
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            fontSize: "0.95rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "16px 22px",
          background: "var(--color-superficie)",
          border: "1px solid var(--color-borde)",
          borderRadius: "10px",
          marginBottom: "20px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Estado del Orden:</span>
          {ajustadoManualmente ? (
            <Badge variant="secondary" style={{ padding: "6px 12px", fontSize: "0.88rem" }}>
              ✏ Modificado manualmente
            </Badge>
          ) : (
            <Badge variant="activo" style={{ padding: "6px 12px", fontSize: "0.88rem" }}>
              ✓ Automático (proporción decreciente)
            </Badge>
          )}
          {ajustadoManualmente && fechaAjuste && (
            <span style={{ fontSize: "0.85rem", color: "var(--color-texto-sec)" }}>
              Por {usuarioAjuste || "Administrador"} el{" "}
              {new Date(fechaAjuste).toLocaleString()}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {ajustadoManualmente && (
            <button
              type="button"
              className="btn-cancelar"
              style={{ fontSize: "0.9rem", padding: "8px 16px" }}
              onClick={() => setDialogResetAbierto(true)}
            >
              ↺ Restablecer orden automático
            </button>
          )}
          <button
            type="button"
            className="btn-cancelar"
            style={{ fontSize: "0.9rem", padding: "8px 16px" }}
            onClick={() => setDialogImportarAbierto(true)}
          >
            📥 Importar de lote
          </button>
          <button
            type="button"
            className="btn-agregar"
            style={{ fontSize: "0.9rem", padding: "8px 18px" }}
            onClick={abrirModalNuevo}
          >
            + Agregar ingrediente / aditivo
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          padding: "16px 22px",
          background: "var(--color-superficie)",
          border: "1px solid var(--color-borde)",
          borderRadius: "10px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "0.95rem", fontWeight: 600, minWidth: "240px" }}>
          Formato de declaración de aditivos:
        </span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { id: "ins_y_nombre", label: "INS y Nombre" },
            { id: "nombre_e_ins", label: "Nombre e INS" },
            { id: "solo_ins", label: "Solo INS" },
            { id: "solo_nombre", label: "Solo Nombre" },
          ].map((opc) => (
            <button
              key={opc.id}
              type="button"
              onClick={() =>
                cambiarFormatoAditivos(opc.id as FormatoDeclaracionAditivos)
              }
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor:
                  formato === opc.id
                    ? "var(--color-primario, #2563eb)"
                    : "var(--color-borde)",
                background:
                  formato === opc.id
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color: formato === opc.id ? "#ffffff" : "var(--color-texto)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: formato === opc.id ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              {opc.label}
            </button>
          ))}
        </div>
      </div>

      <Card
        style={{
          marginBottom: "32px",
          width: "100%",
          overflow: "hidden",
          border: "1px solid var(--color-borde)",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
        }}
      >
        <CardHeader
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid var(--color-borde)",
            background: "var(--color-superficie)",
          }}
        >
          <CardTitle style={{ fontSize: "1.35rem", fontWeight: 700 }}>
            Ingredientes y Aditivos del Producto
          </CardTitle>
          <CardDescription style={{ fontSize: "0.95rem", marginTop: "4px", lineHeight: "1.5" }}>
            Los ingredientes principales se ubican al inicio en orden
            decreciente según su proporción; los aditivos continúan a
            continuación agrupados por función. Utilice los controles para
            ajustar el orden manual si fuese necesario.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: "0" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", fontSize: "1rem" }}>
              Cargando lista de ingredientes...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 2rem" }}>
              <p
                style={{
                  color: "var(--color-texto-sec)",
                  marginBottom: "20px",
                  fontSize: "1.05rem",
                }}
              >
                Aún no hay ingredientes ni aditivos cargados para este producto.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  className="btn-agregar"
                  style={{ fontSize: "0.95rem", padding: "10px 20px" }}
                  onClick={abrirModalNuevo}
                >
                  + Agregar primer ingrediente
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  style={{ fontSize: "0.95rem", padding: "10px 20px" }}
                  onClick={() => setDialogImportarAbierto(true)}
                >
                  📥 Cargar desde producción
                </button>
              </div>
            </div>
          ) : (
            <div
              className="tabla-wrapper"
              style={{
                border: "none",
                borderRadius: "0",
                boxShadow: "none",
                width: "100%",
                overflowX: "auto",
              }}
            >
              <table className="tabla-custom" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        width: "120px",
                        textAlign: "center",
                        padding: "1.2rem 1.1rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      Orden
                    </th>
                    <th
                      style={{
                        minWidth: "240px",
                        padding: "1.2rem 1.4rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      Denominación para Rótulo
                    </th>
                    <th
                      style={{
                        minWidth: "220px",
                        padding: "1.2rem 1.4rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      Tipo y Función
                    </th>
                    <th
                      style={{
                        width: "150px",
                        textAlign: "right",
                        padding: "1.2rem 1.4rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      Proporción
                    </th>
                    <th
                      style={{
                        minWidth: "280px",
                        padding: "1.2rem 1.4rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      Declaración en Rótulo
                    </th>
                    <th
                      className="acciones-col"
                      style={{
                        width: "160px",
                        minWidth: "160px",
                        textAlign: "right",
                        padding: "1.2rem 1.4rem",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={`${it.id || idx}-${it.nombre}`}
                      style={{
                        backgroundColor: it.es_aditivo
                          ? "rgba(147, 51, 234, 0.03)"
                          : "transparent",
                      }}
                    >
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 600,
                          padding: "1.2rem 1.1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              minWidth: "32px",
                              fontSize: "1.05rem",
                              fontWeight: 700,
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                            }}
                          >
                            <button
                              type="button"
                              className="btn-icon"
                              title="Subir posición"
                              disabled={idx === 0}
                              onClick={() => moverItem(idx, "arriba")}
                              style={{
                                padding: 0,
                                width: "26px",
                                height: "22px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "4px",
                                border: "1px solid var(--color-borde)",
                                background: "var(--color-superficie)",
                                cursor: idx === 0 ? "not-allowed" : "pointer",
                                opacity: idx === 0 ? 0.3 : 1,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Bajar posición"
                              disabled={idx === items.length - 1}
                              onClick={() => moverItem(idx, "abajo")}
                              style={{
                                padding: 0,
                                width: "26px",
                                height: "22px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "4px",
                                border: "1px solid var(--color-borde)",
                                background: "var(--color-superficie)",
                                cursor: idx === items.length - 1 ? "not-allowed" : "pointer",
                                opacity: idx === items.length - 1 ? 0.3 : 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "1.2rem 1.4rem" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "1.02rem",
                          }}
                        >
                          {it.denominacion_rotulo || it.nombre}
                        </div>
                        {it.denominacion_rotulo &&
                          it.denominacion_rotulo !== it.nombre && (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-texto-sec)",
                                marginTop: "3px",
                              }}
                            >
                              Insumo: {it.nombre}
                            </div>
                          )}
                      </td>

                      <td style={{ padding: "1.2rem 1.4rem" }}>
                        {it.es_aditivo ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <Badge variant="secondary" style={{ fontSize: "0.88rem", padding: "4px 10px" }}>
                              {it.funcion || "Aditivo"}
                            </Badge>
                            {it.numero_ins && (
                              <Badge variant="outline" style={{ fontSize: "0.88rem", padding: "4px 10px" }}>
                                INS {it.numero_ins}
                              </Badge>
                            )}
                            {it.es_aromatizante && (
                              <Badge
                                variant="al_dia"
                                style={{ fontSize: "0.88rem", padding: "4px 10px" }}
                                title="Se declara únicamente por su función"
                              >
                                Solo función
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" style={{ fontSize: "0.88rem", padding: "4px 10px" }}>
                            Ingrediente
                          </Badge>
                        )}
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          padding: "1.2rem 1.4rem",
                        }}
                      >
                        {it.porcentaje.toFixed(2)} %
                      </td>

                      <td
                        style={{
                          fontStyle: "italic",
                          color: "var(--color-texto)",
                          fontSize: "1rem",
                          lineHeight: "1.6",
                          padding: "1.2rem 1.4rem",
                        }}
                      >
                        {it.texto_declaracion ||
                          (it.denominacion_rotulo || it.nombre)}
                      </td>

                      <td
                        className="acciones-col"
                        style={{
                          textAlign: "right",
                          padding: "1.2rem 1.4rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div
                          className="acciones-btns"
                          style={{ justifyContent: "flex-end", gap: "8px" }}
                        >
                          <button
                            type="button"
                            className="btn-icon btn-editar"
                            title="Editar"
                            onClick={() => abrirModalEditar(idx)}
                            style={{ padding: "8px 12px", fontSize: "1rem" }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-eliminar"
                            title="Eliminar"
                            onClick={() => eliminarItem(idx)}
                            style={{ padding: "8px 12px", fontSize: "1rem" }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        style={{
          border: "2px solid rgba(37, 99, 235, 0.3)",
          background: "var(--color-superficie)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
          borderRadius: "12px",
          width: "100%",
        }}
      >
        <CardHeader
          style={{
            borderBottom: "1px solid rgba(37, 99, 235, 0.2)",
            background: "rgba(37, 99, 235, 0.03)",
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <CardTitle style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                Vista Previa para el Rótulo
              </CardTitle>
              <CardDescription style={{ fontSize: "0.95rem", marginTop: "4px" }}>
                Texto estandarizado listo para imprimirse en la etiqueta del
                producto. Disponible para el módulo de rotulado sin requerir
                recargas.
              </CardDescription>
            </div>
            <Badge variant="al_dia" style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
              Rótulo generado
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ padding: "28px" }}>
          {textoRotulo ? (
            <div
              style={{
                padding: "22px 28px",
                background: "var(--color-fondo, #f8fafc)",
                border: "1px dashed var(--color-borde)",
                borderRadius: "10px",
                fontFamily: "monospace",
                fontSize: "1.1rem",
                lineHeight: "1.8",
                color: "var(--color-texto)",
                wordBreak: "break-word",
              }}
            >
              {textoRotulo}
            </div>
          ) : (
            <p style={{ color: "var(--color-texto-sec)", margin: 0, fontSize: "1rem" }}>
              Cargue al menos un ingrediente para generar la declaración del
              rótulo.
            </p>
          )}

          <div
            style={{
              marginTop: "16px",
              fontSize: "0.85rem",
              color: "var(--color-texto-sec)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>ℹ</span>
            <span>
              Regulación CAA / Mercosur Res. 26/03: Aromatizantes declarados
              únicamente por función; aditivos al final agrupados por función.
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>
              {indiceEdicion !== null
                ? "Editar Ingrediente / Aditivo"
                : "Agregar Ingrediente o Aditivo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); guardarModalItem(); }}>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="formNombre">Nombre Comercial / Insumo *</label>
              <input
                id="formNombre"
                type="text"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Ej. Harina de trigo 0000, Lecitina de soja"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="formDenominacion">
                Denominación para el Rótulo (opcional)
              </label>
              <input
                id="formDenominacion"
                type="text"
                value={formDenominacion}
                onChange={(e) => setFormDenominacion(e.target.value)}
                placeholder="Nombre legal que saldrá en la lista de ingredientes"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="formPorcentaje">Proporción (%) *</label>
              <input
                id="formPorcentaje"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={formPorcentaje}
                onChange={(e) => setFormPorcentaje(e.target.value)}
                placeholder="Ej. 65.5"
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                padding: "8px 12px",
                background: "var(--color-superficie)",
                border: "1px solid var(--color-borde)",
                borderRadius: "6px",
              }}
            >
              <input
                id="formEsAditivo"
                type="checkbox"
                checked={formEsAditivo}
                onChange={(e) => setFormEsAditivo(e.target.checked)}
                style={{ width: "16px", height: "16px" }}
              />
              <label
                htmlFor="formEsAditivo"
                style={{ fontWeight: 600, cursor: "pointer", margin: 0 }}
              >
                ¿Es un aditivo alimentario?
              </label>
            </div>

            {formEsAditivo && (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(147, 51, 234, 0.05)",
                  border: "1px solid rgba(147, 51, 234, 0.2)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label htmlFor="formFuncion">Función Tecnológica *</label>
                  <input
                    id="formFuncion"
                    type="text"
                    list="funciones-sugeridas"
                    value={formFuncion}
                    onChange={(e) => setFormFuncion(e.target.value)}
                    placeholder="Ej. Conservante, Emulsionante, Aromatizante"
                  />
                  <datalist id="funciones-sugeridas">
                    {FUNCIONES_COMUNES.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label htmlFor="formIns">Número INS (opcional)</label>
                  <input
                    id="formIns"
                    type="text"
                    value={formIns}
                    onChange={(e) => setFormIns(e.target.value)}
                    placeholder="Ej. 202, 322, 330"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    id="formEsAroma"
                    type="checkbox"
                    checked={formEsAroma}
                    onChange={(e) => setFormEsAroma(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <label
                    htmlFor="formEsAroma"
                    style={{ fontSize: "0.85rem", cursor: "pointer", margin: 0 }}
                  >
                    Es aromatizante / saborizante (se declarará solo por su
                    función)
                  </label>
                </div>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => setModalAbierto(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-guardar">
                {indiceEdicion !== null ? "Guardar Cambios" : "Agregar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={dialogResetAbierto}
        title="¿Restablecer orden automático?"
        description="Se recalculará la secuencia ordenando los ingredientes por porcentaje decreciente y colocando los aditivos al final agrupados por función. Se perderán los ajustes manuales de posición."
        confirmText="Restablecer"
        cancelText="Cancelar"
        onConfirm={ejecutarRestablecerAutomatico}
        onCancel={() => setDialogResetAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogImportarAbierto}
        title="¿Importar insumos del lote de producción?"
        description="Se calcularán las proporciones porcentuales de los insumos usados en el lote de producción más reciente de este producto y se clasificarán automáticamente en ingredientes y aditivos."
        confirmText="Importar"
        cancelText="Cancelar"
        onConfirm={ejecutarImportarLote}
        onCancel={() => setDialogImportarAbierto(false)}
      />

      <ErrorAlertDialog
        open={Boolean(errorMsg)}
        title="Atención"
        description={errorMsg || ""}
        onClose={() => setErrorMsg(null)}
      />
    </div>
  );
};

