import { useEffect, useState } from 'react';
import type { EquipoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { ConfirmAlertDialog, ErrorAlertDialog, SuccessAlertDialog } from '../../components/ui/alert-dialog';

interface EliminarEquipoProps {
  equipoID?: number | null;
  onCancel?: () => void;
  onSucces?: () => void;
}

export default function EliminarEquipo({ equipoID, onCancel, onSucces }: EliminarEquipoProps) {
  const [equipo, setEquipo] = useState<EquipoConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [exitoAbierto, setExitoAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEliminar = async (id?: number) => {
    if (!id) return;
    setConfirmAbierto(false);
    try {
      const res = await apiFetch(`/equipos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEquipo(null);
        setExitoAbierto(true);
      } else {
        setErrorMsg('No se pudo eliminar el equipo.');
      }
    } catch {
      setErrorMsg('No se pudo eliminar el equipo.');
    }
  };

  useEffect(() => {
    if (equipoID) {
      const fetchEquipo = async () => {
        try {
          const res = await apiFetch(`/equipos/${equipoID}`);
          if (res.ok) {
            const data = await res.json();
            setEquipo(data);
          }
        } catch {
          setErrorMsg("El equipo no existe.");
        } finally {
          setLoading(false);
        }
      };
      fetchEquipo();
    }
  }, [equipoID]);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Eliminar Equipo</h1>
        <div className="subtitulo">Equipo: {equipoID}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Cargando equipo...
        </div>
      ) : equipo ? (
        <form>
          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={equipo.nombre}
              disabled
            />
          </div>
          <div className="form-group">
            <label htmlFor="categoria">Categoría:</label>
            <input
              id="categoria"
              name="categoria"
              value={equipo.categoria}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="ubicacion">Ubicación</label>
            <input
              id="ubicacion"
              name="ubicacion"
              type="text"
              value={equipo.ubicacion?.nombre || ''}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_de_Limpieza">Plan de Limpieza</label>
            <input
              id="plan_de_Limpieza"
              name="plan_de_Limpieza"
              type="text"
              value={equipo.plan_de_Limpieza?.nombre || ''}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
            <input
              id="plan_de_calibracion"
              name="plan_de_calibracion"
              type="text"
              value={equipo.plan_de_calibracion?.nombre || ''}
              disabled
            />
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          El equipo no existe.
        </div>
      )}

      <div className="form-acciones">
        <button className="btn-eliminar" title="Eliminar" onClick={() => setConfirmAbierto(true)}>
          Eliminar
        </button>
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <ConfirmAlertDialog
        open={confirmAbierto}
        title="¿Dar de baja este equipo?"
        description={`¿Estás seguro de que deseas dar de baja el equipo "${equipo?.nombre || ''}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => handleEliminar(equipoID ?? undefined)}
        onCancel={() => setConfirmAbierto(false)}
      />

      <SuccessAlertDialog
        open={exitoAbierto}
        title="Eliminación exitosa"
        description="El equipo fue dado de baja correctamente."
        onClose={() => {
          setExitoAbierto(false);
          onSucces?.();
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorMsg)}
        description={errorMsg || ''}
        onClose={() => setErrorMsg(null)}
      />
    </div>
  );
}
