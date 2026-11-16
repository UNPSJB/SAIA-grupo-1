import { useState } from "react";
import type { InsumoConId } from "./tipos";
import { DatosNutricionalesModal } from "./DatosNutricionalesModal";
import "../../styles/formularioAlta.css";

interface VerInsumoProps {
  insumo: InsumoConId;
  onEditarClick?: (insumo: InsumoConId) => void;
  onVolver?: () => void;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

export default function VerInsumo({ insumo, onEditarClick, onVolver }: VerInsumoProps) {
  const [modalNutricionAbierto, setModalNutricionAbierto] = useState<boolean>(false);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalles del Insumo</h1>
        <div className="subtitulo">03 · Consulta</div>
      </div>

      <div>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            value={insumo.nombre}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="lote">Lote</label>
          <input
            id="lote"
            type="text"
            value={insumo.lote}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaRecepcion">Fecha de Recepción</label>
          <input
            id="fechaRecepcion"
            type="text"
            value={formatDate(insumo.fechaRecepcion)}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de Vencimiento</label>
          <input
            id="fechaVencimiento"
            type="text"
            value={formatDate(insumo.fechaVencimiento)}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cantRecibida">Cantidad Recibida</label>
          <input
            id="cantRecibida"
            type="text"
            value={insumo.cantRecibida}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="stock">Stock Actual</label>
          <input
            id="stock"
            type="text"
            value={insumo.stock}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="medida">Unidad de Medida</label>
          <input
            id="medida"
            type="text"
            value={insumo.medida}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-acciones">
          <button
            type="button"
            className="btn-guardar"
            onClick={() => setModalNutricionAbierto(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2563eb",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              monitoring
            </span>
            Datos Nutricionales
          </button>
          <button
            type="button"
            className="btn-guardar"
            onClick={() => onEditarClick?.(insumo)}
          >
            Editar
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>

      <DatosNutricionalesModal
        insumo={insumo}
        abierto={modalNutricionAbierto}
        onCerrar={() => setModalNutricionAbierto(false)}
      />
    </div>
  );
}