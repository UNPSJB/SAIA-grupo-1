import React, { useEffect, useState } from "react";
import type { ProductoConId } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { DetalleDocumento } from "../documentos/verDetalle";
import { InformacionNutricionalModal } from "./InformacionNutricionalModal";

interface DetalleProductoProps {
  onCancel?: () => void;
  productoId?: number | null;
  onVerReceta?: (recetaId: number) => void;
}

export const DetalleProducto: React.FC<DetalleProductoProps> = ({ onCancel, productoId, onVerReceta }) => {
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
      <DetalleDocumento
        documentoId={recetaIdInterno}
        onVolver={() => setRecetaIdInterno(null)}
        textoVolver="Volver al Producto"
      />
    );
  }

  return (
    <div className="modulo-container formulario-box">
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
            <label htmlFor="receta">Receta Asociada</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                id="receta"
                name="receta"
                type="text"
                value={producto.nombre_receta || (producto.id_receta ? `Receta #${producto.id_receta}` : "Sin receta asociada")}
                disabled
                style={{ flex: 1 }}
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
            <label htmlFor="descripcion">Descripción</label>
            <input
              id="descripcion"
              name="descripcion"
              type="text"
              value={producto.descripcion || "Sin descripción"}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <div>
              <Badge variant={producto.activo ? "activo" : "inactivo"}>
                {producto.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>

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

          <div className="form-acciones">
            <button type="button" className="btn-cancelar" onClick={onCancel}>
              Volver
            </button>
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
