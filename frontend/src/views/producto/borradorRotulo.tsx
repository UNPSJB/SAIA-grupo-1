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
  ErrorAlertDialog,
  SuccessAlertDialog,
} from "../../components/ui/alert-dialog";
import type {
  BorradorRotuloResponse,
  BorradorRotuloUpdate,
  ExportarBorradorResponse,
  OctogonoItem,
} from "./tiposBorradorRotulo";
import "../../styles/formularioAlta.css";

interface BorradorRotuloProps {
  productoId: number;
  onVolver: () => void;
  onIrAIngredientes: () => void;
}

export const BorradorRotulo: React.FC<BorradorRotuloProps> = ({
  productoId,
  onVolver,
  onIrAIngredientes,
}) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<BorradorRotuloResponse | null>(null);
  const [modalEditarAbierto, setModalEditarAbierto] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [pestanaModal, setPestanaModal] = useState<
    "general" | "establecimiento" | "nutricion" | "sellos" | "uso"
  >("general");

  const [formData, setFormData] = useState<BorradorRotuloUpdate>({});

  const [modalExportarAbierto, setModalExportarAbierto] = useState<boolean>(false);
  const [exportando, setExportando] = useState<boolean>(false);
  const [resultadoExportacion, setResultadoExportacion] =
    useState<ExportarBorradorResponse | null>(null);

  const [dialogoError, setDialogoError] = useState<{
    abierto: boolean;
    titulo: string;
    mensaje: string;
  }>({
    abierto: false,
    titulo: "",
    mensaje: "",
  });

  const [dialogoExito, setDialogoExito] = useState<{
    abierto: boolean;
    titulo: string;
    mensaje: string;
  }>({
    abierto: false,
    titulo: "",
    mensaje: "",
  });

  const sincronizarFormData = (data: BorradorRotuloResponse) => {
    setFormData({
      denominacion_venta: data.denominacion_venta || "",
      contenido_neto: data.contenido_neto || "",
      rnpa_rppa: data.rnpa_rppa || "",
      rne: data.rne || "",
      razon_social: data.razon_social || "",
      direccion_origen: data.direccion_origen || "",
      pais_origen: data.pais_origen || "Industria Argentina",
      lote: data.lote || "",
      fecha_duracion: data.fecha_duracion || "",
      instrucciones_conservacion: data.instrucciones_conservacion || "",
      modo_empleo: data.modo_empleo || "",
      porcion: data.porcion || "30 g (1 porción)",
      porciones_por_envase: data.porciones_por_envase || "",
      valor_energetico_kcal: data.valor_energetico_kcal ?? 0,
      valor_energetico_kj: data.valor_energetico_kj ?? 0,
      carbohidratos: data.carbohidratos ?? 0,
      azucares_totales: data.azucares_totales ?? 0,
      azucares_anadidos: data.azucares_anadidos ?? 0,
      proteinas: data.proteinas ?? 0,
      grasas_totales: data.grasas_totales ?? 0,
      grasas_saturadas: data.grasas_saturadas ?? 0,
      grasas_trans: data.grasas_trans ?? 0,
      fibra_alimentaria: data.fibra_alimentaria ?? 0,
      sodio: data.sodio ?? 0,
      tabla_marcada_incompleta: Boolean(data.tabla_marcada_incompleta),
      tiene_exceso_azucares: Boolean(data.tiene_exceso_azucares),
      tiene_exceso_sodio: Boolean(data.tiene_exceso_sodio),
      tiene_exceso_grasas_saturadas: Boolean(data.tiene_exceso_grasas_saturadas),
      tiene_exceso_grasas_totales: Boolean(data.tiene_exceso_grasas_totales),
      tiene_exceso_calorias: Boolean(data.tiene_exceso_calorias),
      contiene_edulcorantes: Boolean(data.contiene_edulcorantes),
      contiene_cafeina: Boolean(data.contiene_cafeina),
      modo_calculo_octogonos: data.modo_calculo_octogonos || "automatico",
    });
  };

  const cargarBorrador = async () => {
    try {
      setCargando(true);
      setErrorCarga(null);
      const res = await apiFetch(`/productos/${productoId}/borrador-rotulo`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al cargar el borrador de rótulo");
      }
      const data: BorradorRotuloResponse = await res.json();
      setBorrador(data);
      sincronizarFormData(data);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al cargar el borrador";
      setErrorCarga(errorMsg);
      setDialogoError({
        abierto: true,
        titulo: "Error de Carga",
        mensaje: errorMsg,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBorrador();
  }, [productoId]);

  const handleGuardarCambios = async () => {
    try {
      setGuardando(true);
      const res = await apiFetch(
        `/productos/${productoId}/borrador-rotulo`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al guardar el borrador");
      }
      const data: BorradorRotuloResponse = await res.json();
      setBorrador(data);
      sincronizarFormData(data);
      setModalEditarAbierto(false);
      setDialogoExito({
        abierto: true,
        titulo: "Borrador Actualizado",
        mensaje: "Los datos del borrador se guardaron correctamente.",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al guardar el borrador";
      setDialogoError({
        abierto: true,
        titulo: "Error al Guardar",
        mensaje: errorMsg,
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarBorrador = async () => {
    try {
      setExportando(true);
      const res = await apiFetch(
        `/productos/${productoId}/borrador-rotulo/exportar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incluir_leyenda: true,
            formato: "html",
          }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al exportar el borrador");
      }
      const data: ExportarBorradorResponse = await res.json();
      setResultadoExportacion(data);
      setModalExportarAbierto(true);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al exportar el borrador";
      setDialogoError({
        abierto: true,
        titulo: "Error de Exportación",
        mensaje: errorMsg,
      });
    } finally {
      setExportando(false);
    }
  };

  const imprimirBorrador = () => {
    if (!resultadoExportacion?.contenido_html) return;
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.document.write(resultadoExportacion.contenido_html);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => {
        ventana.print();
      }, 350);
    }
  };

  const renderOctogonoSello = (item: OctogonoItem) => {
    if (item.tipo === "micro_sello") {
      return (
        <div
          key={item.id}
          style={{
            backgroundColor: "#000000",
            color: "#ffffff",
            border: "2.5px solid #ffffff",
            outline: "2.5px solid #000000",
            borderRadius: "4px",
            padding: "8px 14px",
            textAlign: "center",
            maxWidth: "240px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 900,
              lineHeight: 1.15,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {item.texto}
          </div>
          <div
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              color: "#cccccc",
              letterSpacing: "0.5px",
            }}
          >
            Ministerio de Salud
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        style={{
          width: "128px",
          height: "128px",
          backgroundColor: "#000000",
          color: "#ffffff",
          clipPath:
            "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 12px",
          textAlign: "center",
          boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
          border: "4px solid #ffffff",
          outline: "3px solid #000000",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 900,
            lineHeight: 1.15,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {item.texto}
        </span>
        <span
          style={{
            fontSize: "0.58rem",
            fontWeight: 700,
            color: "#d1d5db",
            marginTop: "6px",
            letterSpacing: "0.5px",
          }}
        >
          Ministerio de Salud
        </span>
      </div>
    );
  };

  if (cargando) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
          gap: "16px",
          color: "var(--color-texto-sec)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "40px", color: "var(--color-primario)" }}
        >
          label
        </span>
        <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          Cargando borrador de rótulo reglamentario...
        </div>
      </div>
    );
  }

  if (errorCarga || !borrador) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "48px", color: "#dc2626", marginBottom: "12px" }}
        >
          error
        </span>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-texto)" }}>
          No se pudo cargar el borrador de rótulo
        </h2>
        <p style={{ color: "var(--color-texto-sec)", marginTop: "8px", fontSize: "0.98rem" }}>
          {errorCarga || "El producto no cuenta con información de rotulado disponible."}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "24px" }}>
          <button
            type="button"
            onClick={onVolver}
            className="btn-secundario"
            style={{ padding: "8px 20px" }}
          >
            Volver
          </button>
          <button
            type="button"
            onClick={cargarBorrador}
            className="btn-primario"
            style={{ padding: "8px 20px" }}
          >
            Reintentar
          </button>
        </div>
        <ErrorAlertDialog
          open={dialogoError.abierto}
          onClose={() => setDialogoError({ abierto: false, titulo: "", mensaje: "" })}
          title={dialogoError.titulo}
          description={dialogoError.mensaje}
        />
      </div>
    );
  }

  const datosFaltantes = borrador.datos_faltantes || [];
  const filasNutricionales = borrador.filas_tabla_nutricional || [];
  const octogonos = borrador.octogonos || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "8px 16px 40px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "var(--color-texto)",
                letterSpacing: "-0.5px",
                margin: 0,
              }}
            >
              Previsualizar Borrador de Rótulo
            </h1>
            <Badge variant="outline" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              Ley 27.642 / CAA
            </Badge>
          </div>
          <p
            style={{
              color: "var(--color-texto-sec)",
              marginTop: "6px",
              fontSize: "1.02rem",
            }}
          >
            {borrador.producto_nombre} (Producto #{borrador.producto_id})
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onVolver}
            className="btn-secundario"
            style={{ padding: "8px 16px", fontSize: "0.95rem" }}
          >
            Volver al producto
          </button>
          <button
            type="button"
            onClick={onIrAIngredientes}
            className="btn-secundario"
            style={{
              padding: "8px 16px",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              format_list_numbered
            </span>
            <span>Ordenar Ingredientes</span>
          </button>
          <button
            type="button"
            onClick={() => setModalEditarAbierto(true)}
            className="btn-secundario"
            style={{
              padding: "8px 18px",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              edit
            </span>
            <span>Editar Datos del Rótulo</span>
          </button>
          <button
            type="button"
            onClick={handleExportarBorrador}
            disabled={exportando}
            className="btn-primario"
            style={{
              padding: "8px 20px",
              fontSize: "0.95rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              print
            </span>
            <span>{exportando ? "Preparando..." : "Exportar / Imprimir"}</span>
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#fffbeb",
          border: "2px solid #f59e0b",
          borderRadius: "10px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "36px", color: "#d97706", lineHeight: 1 }}
        >
          warning
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#92400e",
              fontWeight: 800,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Leyenda Regulatoria Obligatoria (CAA / Disposición ANMAT)
          </div>
          <div
            style={{
              color: "#78350f",
              fontWeight: 700,
              fontSize: "1.05rem",
              marginTop: "2px",
            }}
          >
            {borrador.leyenda_obligatoria}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {datosFaltantes.length > 0 ? (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#991b1b",
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px", color: "#b91c1c" }}
              >
                cancel
              </span>
              <span>Datos Obligatorios Faltantes ({datosFaltantes.length})</span>
            </div>
            <p
              style={{
                color: "#7f1d1d",
                fontSize: "0.88rem",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              El rótulo no está apto para revisión formal o trámite oficial ante autoridad sanitaria hasta completar:
            </p>
            <ul
              style={{
                margin: "4px 0 0 18px",
                padding: 0,
                color: "#b91c1c",
                fontSize: "0.88rem",
              }}
            >
              {datosFaltantes.map((item, idx) => (
                <li key={idx} style={{ marginTop: "3px" }}>
                  <strong>{item}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1.5px solid #4ade80",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "28px", color: "#16a34a" }}
            >
              check_circle
            </span>
            <div>
              <div style={{ color: "#166534", fontWeight: 700, fontSize: "0.98rem" }}>
                Todos los datos obligatorios completados
              </div>
              <div style={{ color: "#15803d", fontSize: "0.85rem", marginTop: "2px" }}>
                Denominación, ingredientes, origen, registros y lote cargados.
              </div>
            </div>
          </div>
        )}

        {borrador.tabla_nutricional_incompleta ? (
          <div
            style={{
              backgroundColor: "#fff7ed",
              border: "1.5px solid #fb923c",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#9a3412",
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px", color: "#ea580c" }}
              >
                warning
              </span>
              <span>Tabla Nutricional Incompleta</span>
            </div>
            <p
              style={{
                color: "#c2410c",
                fontSize: "0.88rem",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              La tabla nutricional está marcada como incompleta o sin porción declarada. Debe ser completada con análisis bromatológico o cálculo teórico verificado.
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1.5px solid #4ade80",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "28px", color: "#16a34a" }}
            >
              verified
            </span>
            <div>
              <div style={{ color: "#166534", fontWeight: 700, fontSize: "0.98rem" }}>
                Información Nutricional Completa
              </div>
              <div style={{ color: "#15803d", fontSize: "0.85rem", marginTop: "2px" }}>
                Porción declarada: {borrador.porcion || "30 g"}.
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "24px",
        }}
      >
        <Card
          style={{
            border: "2px solid var(--color-borde)",
            backgroundColor: "var(--color-superficie)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "-32px",
              transform: "rotate(35deg)",
              backgroundColor: "rgba(220, 38, 38, 0.12)",
              color: "#dc2626",
              fontWeight: 900,
              fontSize: "0.75rem",
              padding: "4px 38px",
              letterSpacing: "1px",
              pointerEvents: "none",
              border: "1px dashed rgba(220, 38, 38, 0.3)",
            }}
          >
            BORRADOR
          </div>

          <CardHeader style={{ padding: "24px 28px 16px 28px", borderBottom: "1px solid var(--color-borde)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <CardTitle style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  Cara Principal del Envase (Frontal)
                </CardTitle>
                <CardDescription style={{ fontSize: "0.88rem", marginTop: "4px" }}>
                  Vista frontal requerida por CAA y Ley de Promoción de la Alimentación Saludable.
                </CardDescription>
              </div>
              <Badge variant="secondary">Frente</Badge>
            </div>
          </CardHeader>

          <CardContent style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
              style={{
                minHeight: "130px",
                padding: "16px",
                backgroundColor: "var(--color-fondo, #f8fafc)",
                borderRadius: "10px",
                border: "1px solid var(--color-borde)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--color-texto-sec)",
                  marginBottom: "12px",
                  letterSpacing: "0.5px",
                }}
              >
                Sellos de Advertencia Nutricional (E12)
              </div>

              {borrador.tiene_octogonos && octogonos.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "8px",
                  }}
                >
                  {octogonos.map(renderOctogonoSello)}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #86efac",
                    color: "#166534",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                  }}
                >
                  {borrador.mensaje_octogonos}
                </div>
              )}
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "20px 10px",
                borderBottom: "1px solid var(--color-borde)",
              }}
            >
              <div
                style={{
                  fontSize: "2.1rem",
                  fontWeight: 900,
                  color: "var(--color-texto)",
                  textTransform: "uppercase",
                  letterSpacing: "-0.5px",
                }}
              >
                {borrador.producto_nombre}
              </div>
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  color: "var(--color-texto-sec)",
                  marginTop: "6px",
                  fontStyle: "italic",
                }}
              >
                {borrador.denominacion_venta || "« Denominación de venta reglamentaria pendiente »"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                backgroundColor: "var(--color-fondo, #f8fafc)",
                borderRadius: "8px",
                border: "1px solid var(--color-borde)",
              }}
            >
              <span style={{ fontSize: "0.95rem", color: "var(--color-texto-sec)", fontWeight: 600 }}>
                Contenido Neto:
              </span>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-texto)" }}>
                {borrador.contenido_neto || "Pendiente"}
              </span>
            </div>

            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px dashed #d97706",
                borderRadius: "6px",
                padding: "10px 14px",
                textAlign: "center",
                fontSize: "0.78rem",
                color: "#b45309",
                fontWeight: 600,
              }}
            >
              {borrador.leyenda_obligatoria}
            </div>
          </CardContent>
        </Card>

        <Card
          style={{
            border: "2px solid var(--color-borde)",
            backgroundColor: "var(--color-superficie)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "-32px",
              transform: "rotate(35deg)",
              backgroundColor: "rgba(220, 38, 38, 0.12)",
              color: "#dc2626",
              fontWeight: 900,
              fontSize: "0.75rem",
              padding: "4px 38px",
              letterSpacing: "1px",
              pointerEvents: "none",
              border: "1px dashed rgba(220, 38, 38, 0.3)",
            }}
          >
            BORRADOR
          </div>

          <CardHeader style={{ padding: "24px 28px 16px 28px", borderBottom: "1px solid var(--color-borde)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <CardTitle style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  Cara de Información (Posterior / Lateral)
                </CardTitle>
                <CardDescription style={{ fontSize: "0.88rem", marginTop: "4px" }}>
                  Ingredientes obligatorios, tabla nutricional reglamentaria y registros.
                </CardDescription>
              </div>
              <Badge variant="secondary">Información</Badge>
            </div>
          </CardHeader>

          <CardContent style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
              style={{
                border: "1px solid var(--color-borde)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "var(--color-fondo, #f8fafc)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Lista de Ingredientes
                </span>
                <button
                  type="button"
                  onClick={onIrAIngredientes}
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-primario, #2563eb)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Editar orden / aditivos →
                </button>
              </div>
              <p
                style={{
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  color: "var(--color-texto)",
                  margin: 0,
                  fontFamily: "monospace",
                }}
              >
                {borrador.lista_ingredientes_texto || "Sin ingredientes configurados."}
              </p>
            </div>

            <div
              style={{
                border: "2px solid #000000",
                padding: "12px",
                backgroundColor: "#ffffff",
                color: "#000000",
                fontFamily: "Helvetica, Arial, sans-serif",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  textAlign: "center",
                  borderBottom: "2px solid #000000",
                  paddingBottom: "4px",
                  textTransform: "uppercase",
                }}
              >
                Información Nutricional
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  padding: "4px 0",
                  borderBottom: "1px solid #000000",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Porción: {borrador.porcion || "30 g"}</span>
                <span>{borrador.porciones_por_envase || ""}</span>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.82rem",
                  marginTop: "4px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #000000" }}>
                    <th style={{ textAlign: "left", padding: "3px 0" }}>Cantidad</th>
                    <th style={{ textAlign: "right", padding: "3px 4px" }}>100 g</th>
                    <th style={{ textAlign: "right", padding: "3px 4px" }}>Porción</th>
                    <th style={{ textAlign: "right", padding: "3px 0" }}>% VD (*)</th>
                  </tr>
                </thead>
                <tbody>
                  {filasNutricionales.map((fila, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight:
                          fila.nutriente === "Valor energético" ||
                          fila.nutriente === "Carbohidratos" ||
                          fila.nutriente === "Grasas totales"
                            ? 700
                            : 400,
                      }}
                    >
                      <td style={{ padding: "3px 0" }}>
                        {fila.es_subitem ? `  · ${fila.nutriente}` : fila.nutriente}
                      </td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>
                        {fila.por_100g || "-"}
                      </td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>
                        {fila.por_porcion || "-"}
                      </td>
                      <td style={{ textAlign: "right", padding: "3px 0" }}>
                        {fila.porcentaje_vd || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#4b5563",
                  marginTop: "6px",
                  borderTop: "1px solid #000000",
                  paddingTop: "4px",
                  lineHeight: "1.25",
                }}
              >
                * % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser mayores o menores según sus necesidades energéticas.
              </div>

              {borrador.tabla_nutricional_incompleta && (
                <div
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "4px",
                    marginTop: "6px",
                    borderRadius: "4px",
                  }}
                >
                  TABLA NUTRICIONAL INCOMPLETA — PENDIENTE DE REVISIÓN
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "var(--color-fondo, #f8fafc)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde)",
                }}
              >
                <div style={{ color: "var(--color-texto-sec)", fontWeight: 600 }}>RNE / Razón Social:</div>
                <div style={{ fontWeight: 700, marginTop: "2px" }}>
                  {borrador.rne ? `R.N.E.: ${borrador.rne}` : "RNE Pendiente"} - {borrador.razon_social || "Empresa"}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--color-fondo, #f8fafc)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde)",
                }}
              >
                <div style={{ color: "var(--color-texto-sec)", fontWeight: 600 }}>RNPA / RPPA:</div>
                <div style={{ fontWeight: 700, marginTop: "2px" }}>
                  {borrador.rnpa_rppa ? `R.N.P.A.: ${borrador.rnpa_rppa}` : "RNPA Pendiente"}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--color-fondo, #f8fafc)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde)",
                }}
              >
                <div style={{ color: "var(--color-texto-sec)", fontWeight: 600 }}>Lote / Vencimiento:</div>
                <div style={{ fontWeight: 700, marginTop: "2px" }}>
                  LOTE: {borrador.lote || "Pendiente"} | EXP: {borrador.fecha_duracion || "Pendiente"}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--color-fondo, #f8fafc)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde)",
                }}
              >
                <div style={{ color: "var(--color-texto-sec)", fontWeight: 600 }}>Origen:</div>
                <div style={{ fontWeight: 700, marginTop: "2px" }}>
                  {borrador.pais_origen || "Industria Argentina"}
                </div>
              </div>
            </div>

            {(borrador.instrucciones_conservacion || borrador.modo_empleo) && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--color-texto-sec)",
                  borderTop: "1px solid var(--color-borde)",
                  paddingTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {borrador.instrucciones_conservacion && (
                  <div>
                    <strong>Conservación:</strong> {borrador.instrucciones_conservacion}
                  </div>
                )}
                {borrador.modo_empleo && (
                  <div>
                    <strong>Modo de empleo:</strong> {borrador.modo_empleo}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalEditarAbierto} onOpenChange={setModalEditarAbierto}>
        <DialogContent
          style={{
            maxWidth: "850px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: "1.3rem", fontWeight: 800 }}>
              Configurar Datos del Rótulo
            </DialogTitle>
          </DialogHeader>

          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--color-borde)",
              gap: "8px",
              paddingBottom: "8px",
              overflowX: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setPestanaModal("general")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: pestanaModal === "general" ? 700 : 500,
                backgroundColor:
                  pestanaModal === "general"
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color: pestanaModal === "general" ? "#ffffff" : "var(--color-texto)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setPestanaModal("establecimiento")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: pestanaModal === "establecimiento" ? 700 : 500,
                backgroundColor:
                  pestanaModal === "establecimiento"
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color:
                  pestanaModal === "establecimiento"
                    ? "#ffffff"
                    : "var(--color-texto)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Registros y Origen
            </button>
            <button
              type="button"
              onClick={() => setPestanaModal("nutricion")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: pestanaModal === "nutricion" ? 700 : 500,
                backgroundColor:
                  pestanaModal === "nutricion"
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color:
                  pestanaModal === "nutricion" ? "#ffffff" : "var(--color-texto)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Tabla Nutricional
            </button>
            <button
              type="button"
              onClick={() => setPestanaModal("sellos")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: pestanaModal === "sellos" ? 700 : 500,
                backgroundColor:
                  pestanaModal === "sellos"
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color: pestanaModal === "sellos" ? "#ffffff" : "var(--color-texto)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Sellos E12
            </button>
            <button
              type="button"
              onClick={() => setPestanaModal("uso")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: pestanaModal === "uso" ? 700 : 500,
                backgroundColor:
                  pestanaModal === "uso"
                    ? "var(--color-primario, #2563eb)"
                    : "transparent",
                color: pestanaModal === "uso" ? "#ffffff" : "var(--color-texto)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Conservación y Uso
            </button>
          </div>

          <div
            style={{
              padding: "16px 4px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {pestanaModal === "general" && (
              <>
                <div className="campo">
                  <label>Denominación de Venta Reglamentaria</label>
                  <input
                    type="text"
                    value={formData.denominacion_venta || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, denominacion_venta: e.target.value })
                    }
                    placeholder="Ej: Pan de molde blanco enriquecido..."
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="campo">
                    <label>Contenido Neto</label>
                    <input
                      type="text"
                      value={formData.contenido_neto || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, contenido_neto: e.target.value })
                      }
                      placeholder="Ej: 500 g, 1 kg"
                    />
                  </div>
                  <div className="campo">
                    <label>Identificación de Lote</label>
                    <input
                      type="text"
                      value={formData.lote || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, lote: e.target.value })
                      }
                      placeholder="Ej: L-20261109"
                    />
                  </div>
                </div>
                <div className="campo">
                  <label>Fecha de Duración Mínima / Vencimiento</label>
                  <input
                    type="text"
                    value={formData.fecha_duracion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_duracion: e.target.value })
                    }
                    placeholder="Ej: 30 días a partir de la elaboración / 15/12/2026"
                  />
                </div>
              </>
            )}

            {pestanaModal === "establecimiento" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="campo">
                    <label>R.N.P.A. / R.P.P.A.</label>
                    <input
                      type="text"
                      value={formData.rnpa_rppa || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rnpa_rppa: e.target.value })
                      }
                      placeholder="Ej: 02-584930"
                    />
                  </div>
                  <div className="campo">
                    <label>R.N.E.</label>
                    <input
                      type="text"
                      value={formData.rne || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rne: e.target.value })
                      }
                      placeholder="Ej: 02-034821"
                    />
                  </div>
                </div>
                <div className="campo">
                  <label>Razón Social / Titular</label>
                  <input
                    type="text"
                    value={formData.razon_social || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, razon_social: e.target.value })
                    }
                    placeholder="Ej: Panificadora del Sur S.A."
                  />
                </div>
                <div className="campo">
                  <label>Dirección y Origen de Elaboración</label>
                  <input
                    type="text"
                    value={formData.direccion_origen || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion_origen: e.target.value })
                    }
                    placeholder="Ej: Ruta 3 Km 1400, Trelew, Chubut"
                  />
                </div>
              </>
            )}

            {pestanaModal === "nutricion" && (
              <>
                <div
                  style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #f59e0b",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="chk-incompleta"
                    checked={formData.tabla_marcada_incompleta || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tabla_marcada_incompleta: e.target.checked,
                      })
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="chk-incompleta"
                    style={{
                      cursor: "pointer",
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      color: "#92400e",
                    }}
                  >
                    Marcar Tabla Nutricional como INCOMPLETA (en desarrollo/análisis)
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="campo">
                    <label>Porción Declarada</label>
                    <input
                      type="text"
                      value={formData.porcion || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          porcion: e.target.value,
                        })
                      }
                      placeholder="Ej: 30 g (1 porción)"
                    />
                  </div>
                  <div className="campo">
                    <label>Porciones por Envase</label>
                    <input
                      type="text"
                      value={formData.porciones_por_envase || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, porciones_por_envase: e.target.value })
                      }
                      placeholder="Ej: Aprox. 16 porciones"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  <div className="campo">
                    <label>Valor Energético (kcal)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.valor_energetico_kcal ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valor_energetico_kcal: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Carbohidratos (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.carbohidratos ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carbohidratos: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Azúcares Totales (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.azucares_totales ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          azucares_totales: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Azúcares Añadidos (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.azucares_anadidos ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          azucares_anadidos: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Proteínas (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.proteinas ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proteinas: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Grasas Totales (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.grasas_totales ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grasas_totales: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Grasas Saturadas (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.grasas_saturadas ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grasas_saturadas: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Grasas Trans (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.grasas_trans ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grasas_trans: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Fibra Alimentaria (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.fibra_alimentaria ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fibra_alimentaria: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="campo">
                    <label>Sodio (mg)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.sodio ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sodio: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {pestanaModal === "sellos" && (
              <>
                <div
                  style={{
                    backgroundColor: "var(--color-fondo, #f8fafc)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-borde)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="chk-auto-sellos"
                    checked={formData.modo_calculo_octogonos === "automatico"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modo_calculo_octogonos: e.target.checked
                          ? "automatico"
                          : "manual",
                      })
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="chk-auto-sellos"
                    style={{ cursor: "pointer", fontSize: "0.95rem", fontWeight: 700 }}
                  >
                    Calcular sellos automáticamente según la Ley 27.642 (Recomendado)
                  </label>
                </div>

                {formData.modo_calculo_octogonos === "manual" && (
                  <div
                    style={{
                      border: "1px dashed var(--color-borde)",
                      padding: "16px",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                      Modo Manual: Active los sellos que apliquen:
                    </div>
                    {[
                      { key: "tiene_exceso_azucares", label: "EXCESO EN AZÚCARES" },
                      { key: "tiene_exceso_grasas_totales", label: "EXCESO EN GRASAS TOTALES" },
                      { key: "tiene_exceso_grasas_saturadas", label: "EXCESO EN GRASAS SATURADAS" },
                      { key: "tiene_exceso_calorias", label: "EXCESO EN CALORÍAS" },
                      { key: "tiene_exceso_sodio", label: "EXCESO EN SODIO" },
                      {
                        key: "contiene_edulcorantes",
                        label: "CONTIENE EDULCORANTES: NO RECOMENDABLE EN NIÑOS/AS",
                      },
                      { key: "contiene_cafeina", label: "CONTIENE CAFEÍNA: EVITAR EN NIÑOS/AS" },
                    ].map((item) => (
                      <div
                        key={item.key}
                        style={{ display: "flex", alignItems: "center", gap: "10px" }}
                      >
                        <input
                          type="checkbox"
                          id={`sello-${item.key}`}
                          checked={Boolean(
                            (formData as Record<string, unknown>)[item.key]
                          )}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [item.key]: e.target.checked,
                            })
                          }
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <label
                          htmlFor={`sello-${item.key}`}
                          style={{ cursor: "pointer", fontSize: "0.9rem" }}
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {pestanaModal === "uso" && (
              <>
                <div className="campo">
                  <label>Instrucciones de Conservación</label>
                  <textarea
                    rows={3}
                    value={formData.instrucciones_conservacion || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instrucciones_conservacion: e.target.value,
                      })
                    }
                    placeholder="Ej: Mantener en lugar fresco y seco. Una vez abierto conservar cerrado."
                  />
                </div>
                <div className="campo">
                  <label>Modo de Empleo / Preparación</label>
                  <textarea
                    rows={3}
                    value={formData.modo_empleo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, modo_empleo: e.target.value })
                    }
                    placeholder="Ej: Listo para consumo. Tostar ligeramente antes de servir si se desea."
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter style={{ borderTop: "1px solid var(--color-borde)", paddingTop: "12px" }}>
            <button
              type="button"
              onClick={() => setModalEditarAbierto(false)}
              className="btn-secundario"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarCambios}
              disabled={guardando}
              className="btn-primario"
            >
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalExportarAbierto} onOpenChange={setModalExportarAbierto}>
        <DialogContent style={{ maxWidth: "700px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              Exportación de Borrador de Rótulo
            </DialogTitle>
          </DialogHeader>

          {resultadoExportacion && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "2px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "0.9rem",
                  color: "#92400e",
                  fontWeight: 600,
                }}
              >
                ✓ La leyenda regulatoria obligatoria se incluyó en la exportación:
                <div style={{ fontWeight: 800, marginTop: "4px" }}>
                  {borrador.leyenda_obligatoria}
                </div>
              </div>

              <p style={{ fontSize: "0.92rem", color: "var(--color-texto-sec)", margin: 0 }}>
                El documento generado contiene la ficha técnica y las caras frontal y posterior listas para impresión o envío a la autoridad sanitaria competente.
              </p>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setModalExportarAbierto(false)}
              className="btn-secundario"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={imprimirBorrador}
              className="btn-primario"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                print
              </span>
              <span>Abrir Vista de Impresión / PDF</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ErrorAlertDialog
        open={dialogoError.abierto}
        onClose={() => setDialogoError({ abierto: false, titulo: "", mensaje: "" })}
        title={dialogoError.titulo}
        description={dialogoError.mensaje}
      />

      <SuccessAlertDialog
        open={dialogoExito.abierto}
        onClose={() => setDialogoExito({ abierto: false, titulo: "", mensaje: "" })}
        title={dialogoExito.titulo}
        description={dialogoExito.mensaje}
      />
    </div>
  );
};
