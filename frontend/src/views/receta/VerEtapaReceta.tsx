import React from 'react';
import { formatearReglaUmbral, type RecetaDetalleConId } from './tipos';
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
            <label htmlFor="etapa-grupo">Etapa</label>
            <input id="etapa-grupo" type="text" value={detalle.etapa || 'General'} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="etapa-nombre">Nombre del Paso</label>
            <input id="etapa-nombre" type="text" value={detalle.nombre} disabled />
          </div>

          {detalle.tipo_insumo_id ? (
            <>
              <div className="form-group">
                <label htmlFor="etapa-ingrediente">{detalle.es_aditivo ? 'Aditivo' : 'Ingrediente'}</label>
                <input
                  id="etapa-ingrediente"
                  type="text"
                  value={detalle.nombre_ingrediente ?? `Tipo de insumo #${detalle.tipo_insumo_id}`}
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
            </>
          ) : (
            <div className="form-group">
              <label>Insumo</label>
              <input type="text" value="Paso de procedimiento / control (sin insumo)" disabled />
            </div>
          )}

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

          {detalle.parametros_control && detalle.parametros_control.length > 0 && (
            <div className="form-group">
              <label>Umbrales / Parámetros de Control</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {detalle.parametros_control.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-borde, #334155)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <strong>{p.nombre_dato}</strong>: {formatearReglaUmbral(p)}
                  </div>
                ))}
              </div>
            </div>
          )}

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