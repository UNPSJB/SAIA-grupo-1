import React, { useState } from 'react';
import { ExportIcon } from '../icons/ExportIcon';
import { PdfIcon } from '../icons/PdfIcon';
import type { FormatoGrafico } from '../../utils/exportarGraficos';

interface ConfirmExportGraficoDialogProps {
  open: boolean;
  tituloGrafico: string;
  cantidadGraficos?: number;
  filtrosAplicados?: string;
  loading?: boolean;
  onConfirm: (formato: FormatoGrafico) => void;
  onCancel: () => void;
  tituloModal?: string;
  iconoCard?: string;
}

export const ConfirmExportGraficoDialog: React.FC<ConfirmExportGraficoDialogProps> = ({
  open,
  tituloGrafico,
  cantidadGraficos = 1,
  filtrosAplicados,
  loading = false,
  onConfirm,
  onCancel,
  tituloModal,
  iconoCard,
}) => {
  const [formato, setFormato] = useState<FormatoGrafico>('png');

  if (!open) return null;

  const opciones: { id: FormatoGrafico; label: string; desc: string }[] = [
    { id: 'png', label: 'PNG', desc: 'Alta calidad sin pérdida' },
    { id: 'jpeg', label: 'JPEG', desc: 'Imagen liviana' },
    { id: 'pdf', label: 'PDF', desc: 'Documento listo para imprimir' },
  ];

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
      onClick={onCancel}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--color-superficie, #ffffff)',
          color: 'var(--color-texto, #1a202c)',
          border: '1px solid var(--color-borde, #e2e8f0)',
          borderRadius: '8px',
          padding: '1.25rem',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <ExportIcon size={22} style={{ color: 'var(--color-primario-texto, #2b6cb0)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-texto, #1a202c)' }}>
            {tituloModal || (cantidadGraficos > 1 ? 'Exportar Gráficos Consolidados' : 'Exportar Gráfico')}
          </h3>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-sec, #4a5568)', lineHeight: '1.4' }}>
          <p style={{ margin: '0 0 0.6rem 0' }}>
            Seleccioná el formato de descarga:
          </p>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '0.85rem',
            }}
          >
            {opciones.map((opc) => {
              const activo = formato === opc.id;
              return (
                <button
                  key={opc.id}
                  type="button"
                  onClick={() => setFormato(opc.id)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${activo ? 'var(--color-primario, #3182ce)' : 'var(--color-borde, #cbd5e1)'}`,
                    backgroundColor: activo
                      ? 'var(--color-suave, rgba(49, 130, 206, 0.14))'
                      : 'var(--color-fondo, transparent)',
                    color: activo
                      ? 'var(--color-primario-texto, #2b6cb0)'
                      : 'var(--color-texto-sec, #64748b)',
                    cursor: 'pointer',
                    fontWeight: activo ? 600 : 400,
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {opc.id === 'pdf' ? <PdfIcon /> : <ExportIcon size={15} />}
                    {opc.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 400 }}>
                    {opc.desc}
                  </span>
                </button>
              );
            })}
          </div>

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
              {iconoCard || <span className="material-symbols-outlined">show_chart</span>} {tituloGrafico}
            </div>
            {filtrosAplicados && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-sec, #718096)', marginTop: '3px' }}>
                <span className="material-symbols-outlined">info</span> {filtrosAplicados}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
          <button type="button" onClick={onCancel} disabled={loading} className="btn-cancelar">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(formato)}
            disabled={loading}
            className="btn-guardar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {formato === 'pdf' ? <PdfIcon /> : <ExportIcon size={16} />}
            {loading ? 'Generando...' : `Descargar ${formato.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};