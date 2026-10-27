import React from 'react';
import type { InsumoQuimico } from './tipos';
import { Badge } from '../../components/ui/badge';
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
        <div className="subtitulo">{insumo.nombre} (ID #{insumo.id})</div>
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
        <label htmlFor="proveedor">Proveedor</label>
        <input id="proveedor" value={insumo.proveedor || 'Sin especificar'} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="stock_actual">Existencias Actuales</label>
        <input id="stock_actual" value={insumo.stock_actual} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="estado">Estado</label>
        <div>
          <Badge variant={insumo.activo ? 'activo' : 'inactivo'}>
            {insumo.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
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
