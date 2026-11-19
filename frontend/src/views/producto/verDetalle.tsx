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
  onVerReceta?: (recetaId: number) => void;
  onGestionarIngredientes?: (id: number) => void;
  onVerBorradorRotulo?: (id: number) => void;
}

export const DetalleProducto: React.FC<DetalleProductoProps> = ({
  onCancel,
  productoId,
  onVerReceta,
  onGestionarIngredientes,
  onVerBorradorRotulo,
}) => {
  const [producto, setProducto] = useState<ProductoConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recetaIdInterno, setRecetaIdInterno] = useState<number | null>(null);
  const [modalNutricionAbierto, setModalNutricionAbierto] = useState(false);

  useEffect(() => {
    if (productoId) {
      const fetchProducto = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiFetch(`/productos/${productoId}`);
          if (res.ok) {
            const data = await res.json();
            setProducto(data);
          } else {
            setError("El producto no existe.");
          }
        } catch {
          setError("Error al conectar con el servidor.");
        } finally {
          setLoading(false);
        }
      };
      fetchProducto();
    }
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
                  value={producto.nombre_receta || (producto.id_receta ? `Receta #${producto.id_receta}` : "Sin datos")}
                  disabled
                  style={{ flex: "1 1 200px" }}
                />
                {producto.id_receta && (
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => {
                      if (onVerReceta) {
                        onVerReceta(producto.id_receta!);
                      } else {
                        setRecetaIdInterno(producto.id_receta!);
                      }
                    }}
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
            <label htmlFor="conservacion">Conservación</label>
            <input
              id="conservacion"
              name="conservacion"
              type="text"
              value={producto.conservacion || "Sin datos"}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Alérgenos de Precaución ("Puede contener")</label>
            {producto.alergenos_precaucion && producto.alergenos_precaucion.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                {producto.alergenos_precaucion.map((alg) => (
                  <Badge key={alg.id} variant="secondary">
                    {alg.nombre}
                  </Badge>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value="Sin datos"
                disabled
              />
            )}
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

          {Boolean(producto.id_receta) && (
            <ComposicionPorcentualCard
              productoId={producto.id}
              titulo="Lista de Ingredientes del Producto (Generada desde Receta)"
            />
          )}

          {Boolean(producto.id_receta) && producto.aplica_rotulado !== false && (
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
                  </div>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                    Calcula los valores por 100g, por porción y % VD a partir de la receta y datos de ingredientes.
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
            {onGestionarIngredientes && producto && Boolean(producto.id_receta) && producto.aplica_rotulado !== false && (
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
            {onVerBorradorRotulo && producto && Boolean(producto.id_receta) && producto.aplica_rotulado !== false && (
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
          onClose={() => setModalNutricionAbierto(false)}
        />
      )}
    </div>
  );
};
