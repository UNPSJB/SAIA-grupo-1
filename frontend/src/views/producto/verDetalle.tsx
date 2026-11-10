import React, { useEffect, useState } from "react";
import type { ProductoConId } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { DetalleDocumento } from "../documentos/verDetalle";

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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
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

          <div className="form-acciones">
            <button type="button" className="btn-cancelar" onClick={onCancel}>
              Volver
            </button>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>El producto no existe.</div>
      )}
    </div>
  );
};