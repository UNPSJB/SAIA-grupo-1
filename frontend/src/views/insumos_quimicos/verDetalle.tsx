import React from 'react';
import type { InsumoQuimico } from './tipos';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onEditar: () => void;
}

export const VerDetalle: React.FC<Props> = ({ insumo, onVolver, onEditar }) => {
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#2b2b2b',
    marginBottom: '8px',
  };

  const valorBoxStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#faf9f5',
    border: '1px solid #e7e5de',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#333333',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '20px 0 60px 0',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '800',
              margin: '0 0 6px 0',
              color: '#2b2b2b',
              letterSpacing: '-0.5px',
            }}
          >
            Detalle del Insumo Químico
          </h1>
          <span style={{ fontSize: '15px', color: '#6b6b6b', fontWeight: '500' }}>03 · Consulta</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <div style={valorBoxStyle}>{insumo.nombre}</div>
          </div>

          <div>
            <label style={labelStyle}>Tipo de Químico</label>
            <div style={valorBoxStyle}>{insumo.tipo}</div>
          </div>

          <div>
            <label style={labelStyle}>Unidad de Medida</label>
            <div style={valorBoxStyle}>{insumo.unidad_medida}</div>
          </div>

          <div>
            <label style={labelStyle}>Existencias Actuales</label>
            <div style={valorBoxStyle}>{insumo.stock_actual}</div>
          </div>

          <div>
            <label style={labelStyle}>Estado</label>
            <div style={{ ...valorBoxStyle, display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: insumo.activo ? '#e7f7ed' : '#fdeced',
                  color: insumo.activo ? '#1e7e34' : '#c82333',
                  display: 'inline-block',
                }}
              >
                {insumo.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={onEditar}
              style={{
                backgroundColor: '#32322e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Editar Insumo
            </button>
            <button
              type="button"
              onClick={onVolver}
              style={{
                backgroundColor: '#ffffff',
                color: '#32322e',
                border: '1px solid #32322e',
                borderRadius: '8px',
                padding: '12px 28px',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};