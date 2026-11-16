import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { cambiarEstadoModulo, obtenerEstadoModulo } from './api';
import { formatearFecha, type EstadoModulo } from './tipos';

/** Interruptor del módulo de octógonos. Con el módulo apagado no se pueden calcular sellos en los productos. */
export const InterruptorModulo: React.FC = () => {
  const [estado, setEstado] = useState<EstadoModulo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerEstadoModulo()
      .then((e) => !cancelado && setEstado(e))
      .catch((e: Error) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  const activo = estado?.activo ?? false;

  const aplicarCambio = async () => {
    setConfirmar(false);
    setGuardando(true);
    try {
      setEstado(await cambiarEstadoModulo(!activo));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`rot-tarjeta rot-interruptor ${estado ? (activo ? 'rot-interruptor--activo' : 'rot-interruptor--inactivo') : ''}`}>
      <div className="rot-interruptor-info">
        <div className="rot-interruptor-titulo">
          Módulo de octógonos
          {estado && (
            <span className={`rot-chip ${activo ? 'rot-chip--activo' : 'rot-chip--inactivo'}`}>
              {activo ? 'Activo' : 'Desactivado'}
            </span>
          )}
        </div>
        <span className="rot-texto-sec">
          {cargando
            ? 'Consultando estado...'
            : activo
            ? 'Se pueden calcular los sellos de advertencia desde el detalle de cada producto.'
            : 'El cálculo de sellos está deshabilitado. Los parámetros se pueden seguir gestionando.'}
        </span>
        {estado?.actualizado_en && (
          <span className="rot-texto-sec">
            Último cambio: {formatearFecha(estado.actualizado_en)}
            {estado.actualizado_por_legajo != null && ` · Legajo ${estado.actualizado_por_legajo}`}
          </span>
        )}
      </div>

      <label className="rot-interruptor-control" htmlFor="switch-octogonos">
        <input
          id="switch-octogonos"
          type="checkbox"
          className="switch-input"
          role="switch"
          aria-checked={activo}
          checked={activo}
          disabled={cargando || guardando || !estado}
          onChange={() => setConfirmar(true)}
        />
        {guardando ? 'Guardando...' : activo ? 'Activado' : 'Desactivado'}
      </label>

      <ConfirmAlertDialog
        open={confirmar}
        title={activo ? '¿Desactivar el módulo de octógonos?' : '¿Activar el módulo de octógonos?'}
        description={
          activo
            ? 'No se podrán calcular sellos en los productos hasta volver a activarlo. Los cálculos ya realizados se conservan.'
            : 'Se habilitará el cálculo de sellos de advertencia en el detalle de los productos.'
        }
        confirmText={activo ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        isDestructive={activo}
        onConfirm={aplicarCambio}
        onCancel={() => setConfirmar(false)}
      />

      <ErrorAlertDialog open={Boolean(error)} description={error || ''} onClose={() => setError(null)} />
    </div>
  );
};
