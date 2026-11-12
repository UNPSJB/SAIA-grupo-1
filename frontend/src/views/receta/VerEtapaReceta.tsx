import React from 'react';
import type { RecetaDetalleConId } from './tipos';
import '../../styles/formularioAlta.css';

interface VerDetalleRecetaProps {
  detalle: RecetaDetalleConId | null;
  onCancel?: () => void;
}

export const VerDetalleReceta: React.FC<VerDetalleRecetaProps> = ({
  detalle,
  onCancel,
}) => {
  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Etapa</h1>
        <div className="subtitulo">
          {detalle ? `${detalle.nombre} (ID #${detalle.id})` : 'Etapa de Receta'}
        </div>
      </div>

      {detalle ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="etapa-nombre">Nombre de la Etapa</label>
            <input id="etapa-nombre" type="text" value={detalle.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="etapa-ingrediente">Ingrediente / Insumo</label>
            <input
              id="etapa-ingrediente"
              type="text"
              value={detalle.nombre_ingrediente ?? `Insumo #${detalle.ingrediente_id}`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="etapa-cantidad">Cantidad y Unidad</label>
            <input
              id="etapa-cantidad"
              type="text"
              value={`${detalle.cantidad} ${detalle.unidad_medida}`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="etapa-aditivo">¿Es Aditivo?</label>
            <input
              id="etapa-aditivo"
              type="text"
              value={detalle.es_aditivo ? 'Sí' : 'No'}
              disabled
            />
          </div>

          {detalle.es_aditivo && (
            <>
              <div className="form-group">
                <label htmlFor="etapa-clase">Clase Funcional</label>
                <input
                  id="etapa-clase"
                  type="text"
                  value={detalle.clase_funcional ?? 'No especificada'}
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="etapa-ins">Número INS</label>
                <input
                  id="etapa-ins"
                  type="text"
                  value={detalle.numero_ins ?? 'No aplica'}
                  disabled
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="etapa-operario">Operario a Cargo</label>
            <input
              id="etapa-operario"
              type="text"
              value={
                detalle.nombre_operario
                  ? `${detalle.nombre_operario} (Legajo #${detalle.operario_legajo})`
                  : `Legajo #${detalle.operario_legajo}`
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="etapa-pasos">Procedimiento / Pasos</label>
            <textarea
              id="etapa-pasos"
              value={detalle.descripcion_pasos}
              rows={4}
              disabled
            />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>La etapa no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Cerrar
        </button>
      </div>
    </div>
  );
};