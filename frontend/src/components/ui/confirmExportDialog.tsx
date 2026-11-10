import React from 'react';
import { CsvIcon } from '../icons/CsvIcon';

interface ConfirmExportDialogProps {
  open: boolean;
  totalRegistros: number;
  filtrosAplicados?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmExportDialog: React.FC<ConfirmExportDialogProps> = ({
  open,
  totalRegistros,
  filtrosAplicados = 'Filtros predeterminados',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <CsvIcon style={{ fontSize: '28px', color: '#2b6cb0' }} />
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a202c' }}>
            Confirmar Exportación a CSV
          </h3>
        </div>

        <div style={{ fontSize: '0.95rem', color: '#4a5568', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 0.8rem 0' }}>
            Estás a punto de generar y descargar un archivo CSV con la información filtrada.
          </p>

          <div
            style={{
              backgroundColor: '#f7fafc',
              borderLeft: '4px solid #3182ce',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 600, color: '#2d3748' }}>
              📊 Total a exportar: <span style={{ color: '#2b6cb0' }}>{totalRegistros} registro(s)</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '4px' }}>
              ℹ️ Se incluirán <strong>todas las páginas</strong> resultantes del filtro actual (<em>{filtrosAplicados}</em>).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} disabled={loading} className="btn-cancelar">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || totalRegistros === 0}
            className="btn-guardar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CsvIcon />
            {loading ? 'Exportando...' : 'Descargar CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};