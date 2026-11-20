import React, { useEffect, useState } from "react";
import type { ProductoConId } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { VerReceta } from "../receta/VerReceta";
import { ComposicionPorcentualCard } from "../receta/ComposicionPorcentualCard";
import { RotuladoProducto } from "../rotuladoFrontal/RotuladoProducto";
import { InformacionNutricionalModal } from "./InformacionNutricionalModal";

interface DetalleProductoProps {
  onCancel?: () => void;
  productoId?: number | null;
  onGestionarIngredientes?: (id: number) => void;
  onVerBorradorRotulo?: (id: number) => void;
}

interface RecetaResumen {
  id: number;
  nombre: string;
  id_producto: number;
  activo?: boolean;
}

export const DetalleProducto: React.FC<DetalleProductoProps> = ({
  onCancel,
  productoId,
  onGestionarIngredientes,
  onVerBorradorRotulo,
}) => {
  const [producto, setProducto] = useState<ProductoConId | null>(null);
  const [recetaAsociadaId, setRecetaAsociadaId] = useState<number | null>(null);
  const [recetaAsociadaNombre, setRecetaAsociadaNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recetaIdInterno, setRecetaIdInterno] = useState<number | null>(null);
  const [modalNutricionAbierto, setModalNutricionAbierto] = useState(false);
  const [tablaNutricionalIncompleta, setTablaNutricionalIncompleta] = useState<boolean | null>(null);

  const consultarEstadoNutricional = async () => {
    if (!productoId) return;
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}/ingredientes-incompletos`);
      if (res.ok) {
        const data = await res.json();
        setTablaNutricionalIncompleta(Boolean(data.tabla_incompleta));
      }
    } catch {
    }
  };

  useEffect(() => {
    if (!productoId) return;

    const fetchProductoYReceta = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resProd, resRecetas] = await Promise.all([
          apiFetch(`/productos/${productoId}`),
          apiFetch("/recetas/"),
        ]);

        if (!resProd.ok) {
          setError("El producto no existe.");
          return;
        }

        const dataProd: ProductoConId = await resProd.json();
        setProducto(dataProd);

        const listaRecetas: RecetaResumen[] = resRecetas.ok ? await resRecetas.json() : [];
        const recetaEntidad =
          listaRecetas.find((r) => r.id_producto === dataProd.id && r.activo !== false) ||
          listaRecetas.find((r) => r.id === dataProd.id_receta && r.activo !== false) ||
          null;

        if (recetaEntidad) {
          setRecetaAsociadaId(recetaEntidad.id);
          setRecetaAsociadaNombre(recetaEntidad.nombre);
        } else {
          setRecetaAsociadaId(null);
          setRecetaAsociadaNombre(null);
        }

        await consultarEstadoNutricional();
      } catch {
        setError("Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductoYReceta();
  }, [productoId]);

  if (recetaIdInterno) {
    return (
      <VerReceta
        recetaID={recetaIdInterno}
        onCancel={() => setRecetaIdInterno(null)}
      />
    );
  }

  return (
    <div className="modulo-container detalle-amplio">
      <div className="modulo-header">
        <h1>Detalle de Producto Elaborado</h1>
        <div className="subtitulo">
          {producto ? `${producto.nombre} (ID #${producto.id})` : `Producto: ${productoId}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Cargando producto...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : producto ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={producto.nombre}
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="unidadMedida">Unidad de Medida</label>
              <input
                id="unidadMedida"
                name="unidadMedida"
                type="text"
                value={producto.unidadMedida}
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="peso_unidad_g">Equivalencia en Gramos (Peso por Unidad)</label>
              <input
                id="peso_unidad_g"
                name="peso_unidad_g"
                type="text"
                value={producto.peso_unidad_g != null && producto.peso_unidad_g > 0 ? `${producto.peso_unidad_g} g` : "Sin datos"}
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="receta">Receta Asociada</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  id="receta"
                  name="receta"
                  type="text"
                  value={recetaAsociadaNombre || (recetaAsociadaId ? `Receta #${recetaAsociadaId}` : "Sin datos")}
                  disabled
                  style={{ flex: "1 1 200px" }}
                />
                {recetaAsociadaId && (
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => setRecetaIdInterno(recetaAsociadaId)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      fontSize: "13px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    title="Ver detalle completo de la receta"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      description
                    </span>
                    Ver Detalle de Receta &rarr;
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tamano_porcion_g">Tamaño de Porción</label>
              <input
                id="tamano_porcion_g"
                name="tamano_porcion_g"
                type="text"
                value={
                  producto.tamano_porcion_g != null && producto.tamano_porcion_g > 0
                    ? `${producto.tamano_porcion_g} g${producto.descripcion_porcion ? ` (${producto.descripcion_porcion})` : ""}`
                    : "Sin datos"
                }
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="porciones_por_envase">Porciones por Envase (Calculado)</label>
              <input
                id="porciones_por_envase"
                name="porciones_por_envase"
                type="text"
                value={
                  producto.peso_unidad_g && producto.peso_unidad_g > 0 && producto.tamano_porcion_g && producto.tamano_porcion_g > 0
                    ? `${Number((producto.peso_unidad_g / producto.tamano_porcion_g).toFixed(2))}`
                    : producto.porciones_por_envase != null && producto.porciones_por_envase > 0
                    ? `${producto.porciones_por_envase}`
                    : "Sin datos"
                }
                disabled
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <input
              id="descripcion"
              name="descripcion"
              type="text"
              value={producto.descripcion || "Sin datos"}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <Badge variant={producto.activo ? "activo" : "inactivo"}>
                {producto.activo ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant={producto.aplica_rotulado !== false ? "al_dia" : "secondary"}>
                {producto.aplica_rotulado !== false ? "Aplica Rotulado" : "Exento de Rotulado"}
              </Badge>
            </div>
          </div>

          {Boolean(recetaAsociadaId) && (
            <ComposicionPorcentualCard
              productoId={producto.id}
              titulo="Lista de Ingredientes del Producto (Generada desde Receta)"
            />
          )}

          {Boolean(recetaAsociadaId) && producto.aplica_rotulado === false && (
            <div
              style={{
                margin: "1.5rem 0",
                padding: "1rem 1.25rem",
                backgroundColor: "var(--color-superficie)",
                border: "1px solid var(--color-borde)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "var(--color-texto-sec)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                info
              </span>
              <div>
                <strong style={{ color: "var(--color-texto)" }}>
                  Producto exceptuado del rotulado frontal
                </strong>
                <div style={{ fontSize: "0.9rem", marginTop: "2px" }}>
                  No corresponde el rotulado frontal ni la declaración de octógonos porque el producto no se comercializa envasado en ausencia del cliente.
                </div>
              </div>
            </div>
          )}

          {Boolean(recetaAsociadaId) && producto.aplica_rotulado !== false && (
            <>
              <RotuladoProducto productoId={producto.id} unidadMedida={producto.unidadMedida} />

              <div
                style={{
                  margin: "1.5rem 0",
                  padding: "1.25rem",
                  backgroundColor: "#1e293b",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "1rem" }}>
                    <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: "22px" }}>
                      monitoring
                    </span>
                    <span>Información Nutricional y Cálculo Automático</span>
                    {tablaNutricionalIncompleta === true && (
                      <span
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid #ef4444",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
                        Incompleta
                      </span>
                    )}
                    {tablaNutricionalIncompleta === false && (
                      <span
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          border: "1px solid #22c55e",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                        Completa
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                    {tablaNutricionalIncompleta === true
                      ? "Advertencia: Existen ingredientes con datos nutricionales faltantes o sin fuente registrada."
                      : "Calcula los valores por 100g, por porción y % VD a partir de la receta y datos de ingredientes."}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primario"
                  onClick={() => setModalNutricionAbierto(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: "#0284c7",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    monitoring
                  </span>
                  Ver / Calcular Nutrición
                </button>
              </div>
            </>
          )}

          <div className="form-acciones">
            <button type="button" className="btn-cancelar" onClick={onCancel}>
              Volver
            </button>
            {onGestionarIngredientes && producto && Boolean(recetaAsociadaId) && producto.aplica_rotulado !== false && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => onGestionarIngredientes(producto.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  format_list_numbered
                </span>
                <span>Lista de ingredientes y aditivos</span>
              </button>
            )}
            {onVerBorradorRotulo && producto && Boolean(recetaAsociadaId) && producto.aplica_rotulado !== false && (
              <button
                type="button"
                className="btn-guardar"
                onClick={() => onVerBorradorRotulo(producto.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  label
                </span>
                <span>Previsualizar Borrador de Rótulo</span>
              </button>
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El producto no existe.</div>
      )}

      {modalNutricionAbierto && producto && (
        <InformacionNutricionalModal
          productoId={producto.id}
          nombreProducto={producto.nombre}
          onClose={() => {
            setModalNutricionAbierto(false);
            consultarEstadoNutricional();
          }}
        />
      )}
    </div>
  );
};