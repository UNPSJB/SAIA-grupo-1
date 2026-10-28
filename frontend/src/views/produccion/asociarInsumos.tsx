import React, { useState } from 'react';
import { apiFetch } from '../../api/client';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { mensajeDeError } from '../incidentes/tipos';
import { ModalAgregarInsumos } from './modalAgregarInsumos';
import type { InsumoDelLote, LoteProduccion } from './tipos';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface AsociarInsumosProps {
  lote: LoteProduccion;
  onVolver: () => void;
}

/** Insumos usados en un lote: se agregan desde un modal y se pueden quitar si se cargaron por error. */
export const AsociarInsumos: React.FC<AsociarInsumosProps> = ({ lote: loteInicial, onVolver }) => {
  // cada alta o baja devuelve el lote actualizado, así que no hace falta volver a pedirlo
  const [lote, setLote] = useState<LoteProduccion>(loteInicial);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aQuitar, setAQuitar] = useState<InsumoDelLote | null>(null);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const quitar = async () => {
    if (!aQuitar) return;
    const insumoId = aQuitar.insumo.id;
    setAQuitar(null);
    try {
      const res = await apiFetch(`/lotes/${lote.id}/insumos/${insumoId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(mensajeDeError(errorData.detail, 'No se pudo quitar el insumo.'));
      }
      setLote(await res.json());
    } catch (err: unknown) {
      setErrorDialogMsg(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    }
  };

  return (
    <div className="modulo-container lote-insumos">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Insumos del lote</h1>
          <div className="subtitulo">
            Lote {lote.codigo} · {lote.producto.nombre}
          </div>
        </div>
        {lote.editable && (
          <button type="button" className="btn-agregar" onClick={() => setModalAbierto(true)}>
            + Agregar insumos
          </button>
        )}
      </div>

      {!lote.editable && (
        <div className="alerta-error">Este lote es de un día anterior: está cerrado y ya no se puede modificar.</div>
      )}

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Lote del proveedor</th>
              <th>Cantidad utilizada</th>
              {lote.editable && <th className="acciones-col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {lote.insumos.length === 0 ? (
              <tr>
                <td colSpan={lote.editable ? 4 : 3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Todavía no hay insumos asociados a este lote.
                </td>
              </tr>
            ) : (
              lote.insumos.map((i) => (
                <tr key={i.insumo.id}>
                  <td style={{ fontWeight: 500 }}>{i.insumo.nombre}</td>
                  <td>{i.insumo.lote}</td>
                  <td>
                    {i.cantidad} {i.insumo.medida}
                  </td>
                  {lote.editable && (
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          type="button"
                          className="btn-icon btn-eliminar"
                          title="Quitar insumo"
                          aria-label={`Quitar ${i.insumo.nombre}`}
                          onClick={() => setAQuitar(i)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>

      {modalAbierto && (
        <ModalAgregarInsumos lote={lote} onClose={() => setModalAbierto(false)} onGuardado={setLote} />
      )}

      <ConfirmAlertDialog
        open={Boolean(aQuitar)}
        title="¿Quitar insumo del lote?"
        description={
          aQuitar
            ? `Se quitará "${aQuitar.insumo.nombre}" del lote ${lote.codigo} y sus ${aQuitar.cantidad} ${aQuitar.insumo.medida} volverán al stock.`
            : ''
        }
        confirmText="Quitar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={quitar}
        onCancel={() => setAQuitar(null)}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ''}
        onClose={() => setErrorDialogMsg(null)}
      />
    </div>
  );
};
