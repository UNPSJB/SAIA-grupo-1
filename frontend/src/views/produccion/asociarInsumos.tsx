import React from 'react';
import type { LoteProduccion } from './tipos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface AsociarInsumosProps {
  lote: LoteProduccion;
  onVolver: () => void;
}

/**
 * Lugar reservado para la historia "asociar insumos a un lote": ya recibe el lote guardado,
 * así que esa historia solo tiene que reemplazar el contenido de esta pantalla.
 */
export const AsociarInsumos: React.FC<AsociarInsumosProps> = ({ lote, onVolver }) => (
  <div className="modulo-container formulario-box">
    <div className="modulo-header">
      <h1>Asociar insumos</h1>
      <div className="subtitulo">
        Lote {lote.codigo} · {lote.producto.nombre}
      </div>
    </div>

    <div className="lote-resultado">
      La asociación de insumos al lote estará disponible próximamente. El lote ya quedó registrado y
      se podrá asociar más adelante.
    </div>

    <div className="form-acciones">
      <button type="button" className="btn-cancelar" onClick={onVolver}>
        Volver a registrar lotes
      </button>
    </div>
  </div>
);
