import React, { useEffect, useState } from 'react';
import type { Checklist, PersonalResumen } from './tipos';
import { ErrorAlertDialog, ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';

interface ListadoChecklistsProps {
  onDetalleClick: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoChecklists: React.FC<ListadoChecklistsProps> = ({
  onDetalleClick,
}) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [personal, setPersonal] = useState<PersonalResumen[]>([]);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [responsableLegajo, setResponsableLegajo] = useState<number | ''>('');
  const [generando, setGenerando] = useState(false);

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const mostrarError = (mensaje: string, titulo: string = 'Atención') => {
    setErrorDialog({
      open: true,
      title: titulo,
      message: mensaje,
    });
  };

  const recargarChecklists = async (inactivos: boolean = mostrarInactivos) => {
    setLoading(true);
    try {
      const url = `${API_URL}/checklist/${inactivos ? '?incluir_inactivos=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChecklists(data);
      } else {
        setChecklists([]);
      }
    } catch {
      setChecklists([]);
      mostrarError('No se pudo conectar con el servidor para cargar las checklists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;

    const cargarDatos = async () => {
      try {
        const url = `${API_URL}/checklist/${mostrarInactivos ? '?incluir_inactivos=true' : ''}`;
        const [resChecklists, resPersonal] = await Promise.all([
          fetch(url),
          fetch(`${API_URL}/personal/`),
        ]);

        if (!cancelado) {
          if (resChecklists.ok) {
            const data = await resChecklists.json();
            setChecklists(data);
          } else {
            setChecklists([]);
          }

          if (resPersonal.ok) {
            const dataPersonal: PersonalResumen[] = await resPersonal.json();
            setPersonal(dataPersonal.filter((p) => p.activo));
          }
        }
      } catch {
        if (!cancelado) {
          setChecklists([]);
          mostrarError('No se pudo conectar con el servidor para cargar las checklists.');
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [mostrarInactivos]);

  const hoy = new Date().toISOString().split('T')[0];
  const checklistHoy = checklists.find((c) => c.fecha === hoy && c.activo);

  const handleGenerarChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsableLegajo) {
      mostrarError('Debe seleccionar un responsable válido para generar el checklist.', 'Dato requerido');
      return;
    }

    setGenerando(true);
    try {
      const res = await fetch(`${API_URL}/checklist/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsable_legajo: Number(responsableLegajo),
          fecha: hoy,
        }),
      });

      if (res.ok) {
        const nueva = await res.json();
        setModalGenerar(false);
        setResponsableLegajo('');
        await recargarChecklists(mostrarInactivos);
        onDetalleClick(nueva.id);
      } else {
        const err = await res.json();
        const detalle =
          typeof err.detail === 'string'
            ? err.detail
            : Array.isArray(err.detail)
            ? err.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ')
            : 'Error al generar el checklist del día.';
        mostrarError(detalle, 'No se pudo generar');
      }
    } catch {
      mostrarError('Error de red al intentar generar el checklist.', 'Error de conexión');
    } finally {
      setGenerando(false);
    }
  };

  const confirmarBajaLogica = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);

    try {
      const res = await fetch(`${API_URL}/checklist/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (!mostrarInactivos) {
          setChecklists((prev) => prev.filter((c) => c.id !== id));
        } else {
          setChecklists((prev) =>
            prev.map((c) => (c.id === id ? { ...c, activo: false } : c))
          );
        }
      } else {
        const err = await res.json();
        mostrarError(err.detail || 'No se pudo dar de baja el checklist.');
      }
    } catch {
      mostrarError('Error al intentar dar de baja el checklist.');
    }
  };

  const handleRestaurar = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/checklist/${id}/restaurar`, {
        method: 'POST',
      });
      if (res.ok) {
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? { ...c, activo: true } : c))
        );
      } else {
        const err = await res.json();
        mostrarError(err.detail || 'No se pudo restaurar el checklist.');
      }
    } catch {
      mostrarError('Error al intentar restaurar el checklist.');
    }
  };

  return (
    <div className="checklist-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Historial de Checklists</h1>
          <div className="subtitulo">01 · Historial y Seguimiento</div>
        </div>

        <div className="top-bar-acciones">
          <label className="filtro-check">
            <input
              type="checkbox"
              checked={mostrarInactivos}
              onChange={(e) => setMostrarInactivos(e.target.checked)}
            />
            Mostrar bajas
          </label>

          {checklistHoy ? (
            <button
              onClick={() => onDetalleClick(checklistHoy.id)}
              className="btn-dia-ver"
              title="Abrir el checklist generado para el día de hoy"
            >
              📅 Ver Checklist del Día
            </button>
          ) : (
            <button
              onClick={() => setModalGenerar(true)}
              className="btn-guardar"
              title="Generar checklist para las tareas de hoy"
            >
              + Generar Checklist del Día
            </button>
          )}
        </div>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Cumplimiento</th>
              <th>Responsable</th>
              <th>Registro</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Cargando historial de checklists...
                </td>
              </tr>
            ) : checklists.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  No se encontraron checklists registrados.
                </td>
              </tr>
            ) : (
              checklists.map((c) => {
                const fillClass =
                  c.porcentaje_cumplimiento === 100
                    ? ''
                    : c.porcentaje_cumplimiento > 0
                    ? 'parcial'
                    : 'vacio';

                return (
                  <tr
                    key={c.id}
                    style={{
                      opacity: c.activo ? 1 : 0.65,
                      backgroundColor: c.activo ? 'inherit' : 'var(--code-bg)',
                    }}
                  >
                    <td>
                      <strong>#{c.id}</strong>
                    </td>
                    <td>{c.fecha}</td>
                    <td>
                      <span className={`badge-estado ${c.estado}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td>
                      <div className="barra-progreso-wrapper">
                        <div className="barra-progreso-track">
                          <div
                            className={`barra-progreso-fill ${fillClass}`}
                            style={{ width: `${c.porcentaje_cumplimiento}%` }}
                          />
                        </div>
                        <span className="barra-progreso-texto">
                          {c.porcentaje_cumplimiento}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {c.nombre_responsable || `Legajo: ${c.responsable_legajo}`}
                    </td>
                    <td>
                      <span
                        className={`badge-registro ${
                          c.activo ? 'activo' : 'inactivo'
                        }`}
                      >
                        {c.activo ? '● Activo' : '○ Baja'}
                      </span>
                    </td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          className="btn-icon btn-ver"
                          title="Ver detalle del checklist"
                          onClick={() => onDetalleClick(c.id)}
                        >
                          👁
                        </button>

                        {c.activo ? (
                          <button
                            className="btn-icon btn-eliminar"
                            title="Dar de baja este checklist"
                            onClick={() => setConfirmDeleteId(c.id)}
                          >
                            🗑
                          </button>
                        ) : (
                          <button
                            className="btn-icon"
                            style={{ color: '#059669', borderColor: '#059669' }}
                            title="Restaurar checklist"
                            onClick={() => handleRestaurar(c.id)}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Generar Checklist */}
      {modalGenerar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Generar Checklist del Día</h2>
              <p>Fecha programada: <strong>{hoy}</strong></p>
            </div>

            <form onSubmit={handleGenerarChecklist}>
              <div className="form-group">
                <label htmlFor="responsable">Responsable de la Checklist *</label>
                <select
                  id="responsable"
                  value={responsableLegajo}
                  onChange={(e) =>
                    setResponsableLegajo(
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                  required
                >
                  <option value="">-- Seleccione una persona activa --</option>
                  {personal.map((p) => (
                    <option key={p.legajo} value={p.legajo}>
                      {p.apellido}, {p.nombre} (Legajo: {p.legajo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-acciones">
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={generando || !responsableLegajo}
                >
                  {generando ? 'Generando...' : 'Generar Checklist'}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setModalGenerar(false);
                    setResponsableLegajo('');
                  }}
                  disabled={generando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerta de Error con shadcn AlertDialog */}
      <ErrorAlertDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog((prev) => ({ ...prev, open: false }))}
        title={errorDialog.title}
        description={errorDialog.message}
      />

      {/* Alerta de Confirmación de Baja con shadcn AlertDialog */}
      <ConfirmAlertDialog
        open={confirmDeleteId !== null}
        onConfirm={confirmarBajaLogica}
        onCancel={() => setConfirmDeleteId(null)}
        title="¿Dar de baja este checklist?"
        description="El checklist quedará inactivo en el historial y no aparecerá en las consultas estándar salvo que se habilite 'Mostrar bajas'. No se borrará físicamente y podrá ser restaurado posteriormente."
        confirmText="Dar de baja"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </div>
  );
};

