import type { InsumoConId } from "./tipos";
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
          <label htmlFor="fechaRecepcion">Fecha de recepción</label>
          <input
            id="fechaRecepcion"
            type="text"
            value={formatDate(insumo.fechaRecepcion)}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de vencimiento</label>
          <input
            id="fechaVencimiento"
            type="text"
            value={formatDate(insumo.fechaVencimiento)}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cantRecibida">Cantidad recibida</label>
          <input
            id="cantRecibida"
            type="text"
            value={`${insumo.cantRecibida} ${insumo.medida}`}
            readOnly
            style={{ cursor: "default" }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="stock">Stock actual</label>
          <input
            id="stock"
            type="text"
            value={`${insumo.stock} ${insumo.medida}`}
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
            onClick={() => onEditarClick?.(insumo)}
          >
            Editar
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
