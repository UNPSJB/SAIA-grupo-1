import React, { useState } from 'react';
import { CsvIcon } from '../icons/CsvIcon';
import { PdfIcon } from '../icons/PdfIcon';
import { ExportIcon } from '../icons/ExportIcon';

export type FormatoExportacion = 'csv' | 'pdf';

interface ConfirmExportDialogProps {
  open: boolean;
  totalRegistros: number;
  filtrosAplicados?: string;
  loading?: boolean;
  onConfirm: (formato: FormatoExportacion) => void;
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
  const [formato, setFormato] = useState<FormatoExportacion>('csv');

  if (!open) return null;

  const esPdf = formato === 'pdf';

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--color-superficie, #ffffff)',
          color: 'var(--color-texto, #1a202c)',
          border: '1px solid var(--color-borde, #e2e8f0)',
          borderRadius: '8px',
          padding: '1.25rem',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <ExportIcon size={22} style={{ color: 'var(--color-primario-texto, #2b6cb0)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-texto, #1a202c)' }}>
            Confirmar Exportación de Datos
          </h3>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-sec, #4a5568)', lineHeight: '1.4' }}>
          <p style={{ margin: '0 0 0.6rem 0' }}>
            Seleccioná el formato de descarga:
          </p>

          {/* Opciones adaptables a tema claro / oscuro */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '0.85rem',
            }}
          >
            <button
              type="button"
              onClick={() => setFormato('csv')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${!esPdf ? 'var(--color-primario, #3182ce)' : 'var(--color-borde, #cbd5e1)'}`,
                backgroundColor: !esPdf
                  ? 'var(--color-suave, rgba(49, 130, 206, 0.14))'
                  : 'var(--color-fondo, transparent)',
                color: !esPdf
                  ? 'var(--color-primario-texto, #2b6cb0)'
                  : 'var(--color-texto-sec, #64748b)',
                cursor: 'pointer',
                fontWeight: !esPdf ? 600 : 400,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CsvIcon/> CSV
            </button>

            <button
              type="button"
              onClick={() => setFormato('pdf')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${esPdf ? 'var(--color-primario, #3182ce)' : 'var(--color-borde, #cbd5e1)'}`,
                backgroundColor: esPdf
                  ? 'var(--color-suave, rgba(49, 130, 206, 0.14))'
                  : 'var(--color-fondo, transparent)',
                color: esPdf
                  ? 'var(--color-primario-texto, #2b6cb0)'
                  : 'var(--color-texto-sec, #64748b)',
                cursor: 'pointer',
                fontWeight: esPdf ? 600 : 400,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <PdfIcon/> PDF
            </button>
          </div>

          {/* Caja de resumen */}
          <div
            style={{
              backgroundColor: 'var(--color-fondo, #f7fafc)',
              border: '1px solid var(--color-borde, #e2e8f0)',
              borderLeft: '4px solid var(--color-primario, #3182ce)',
              padding: '0.6rem 0.75rem',
              borderRadius: '4px',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-texto, #2d3748)', fontSize: '0.85rem' }}>
              📊 Total a exportar:{' '}
              <span style={{ color: 'var(--color-primario-texto, #2b6cb0)' }}>
                {totalRegistros} registro(s)
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-sec, #718096)', marginTop: '2px' }}>
              ℹ️ Se incluirán <strong>todas las páginas</strong> resultantes (<em>{filtrosAplicados}</em>).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
          <button type="button" onClick={onCancel} disabled={loading} className="btn-cancelar">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(formato)}
            disabled={loading || totalRegistros === 0}
            className="btn-guardar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {esPdf ? <PdfIcon/> : <CsvIcon/>}
            {loading ? 'Exportando...' : `Descargar ${esPdf ? 'PDF' : 'CSV'}`}
          </button>
        </div>
      </div>
    </div>
  );
};