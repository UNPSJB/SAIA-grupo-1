import React, { useEffect, useState } from "react";
import type { ProductoConId } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/ui/badge";

interface DetalleProductoProps {
  onCancel?: () => void;
  productoId?: number | null;
}

export const DetalleProducto: React.FC<DetalleProductoProps> = ({ onCancel, productoId }) => {
  const [producto, setProducto] = useState<ProductoConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <input
              id="receta"
              name="receta"
              type="text"
              value={producto.nombre_receta || "Sin receta asociada"}
              disabled
            />
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