import React from 'react';
import type { InsumoQuimico } from './tipos';
import '../../styles/formularioAlta.css';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onEditar: () => void;
}

export const VerDetalle: React.FC<Props> = ({ insumo, onVolver, onEditar }) => {
  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle del Insumo Químico</h1>
        <div className="subtitulo">03 · Consulta</div>
      </div>

      <div className="form-group">
        <label htmlFor="nombre">Nombre</label>
        <input id="nombre" value={insumo.nombre} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="tipo">Tipo de Químico</label>
        <input id="tipo" value={insumo.tipo} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="unidad_medida">Unidad de Medida</label>
        <input id="unidad_medida" value={insumo.unidad_medida} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="stock_actual">Existencias Actuales</label>
        <input id="stock_actual" value={insumo.stock_actual} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="estado">Estado</label>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: insumo.activo ? '#dcfce7' : '#fee2e2',
            color: insumo.activo ? '#166534' : '#991b1b',
          }}
        >
          {insumo.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="form-acciones">
        <button type="button" className="btn-guardar" onClick={onEditar}>
          Editar Insumo
        </button>
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>
    </div>
  );
};
