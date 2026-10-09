import { useCallback, useEffect, useState } from "react";
import type { PlanConId } from "./tipos";
import type { EquipoConId } from '../equipos/tipos';
import type { Sector } from '../sectores/tipos';
import "../../styles/formularioAlta.css";
import EditarTarea from "../tareas/editarTarea";
import { VerTarea } from "../tareas/verTarea";
import NuevaTarea from "../tareas/nuevaTarea";
import type { TareaConId } from "../tareas/tipos";
import { ConfirmAlertDialog } from "../../components/ui/alert-dialog";
import { apiFetch } from '../../api/client';

const PLAN_INICIAL: PlanConId = {
  id: 0,
  nombre: "",
  equipo_id: null,
  sector_id: null,
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

interface EditarPlanDeLimpizaProps {
  planlimpiezaID: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditarPlanDeLimpieza({ planlimpiezaID, onSuccess, onCancel }: EditarPlanDeLimpizaProps) {
  const [planLimpieza, setPlanLimp] = useState<PlanConId>(PLAN_INICIAL);
  const [tipoObjetivo, setTipoObjetivo] = useState<'equipo' | 'sector'>('equipo');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<EquipoConId[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [modalAbierto, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalVerTarea, setModelVer] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<number | null>(null);
  const [tareaAConfirmar, setTareaAConfirmar] = useState<TareaConId | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);

  const fetchPlanLimp = useCallback(async () => {
    if (!planlimpiezaID) return;
    try {
      const res = await apiFetch(`/plan_De_limpieza/${planlimpiezaID}`);
      if (res.ok) {
        const data = await res.json();
        setPlanLimp(data);
        if (data.sector_id) {
          setTipoObjetivo('sector');
        } else {
          setTipoObjetivo('equipo');
        }
      }
    } catch {
      alert('El Plan de limpieza no existe.');
    } finally {
      setLoading(false);
    }
  }, [planlimpiezaID]);

  useEffect(() => {
    fetchPlanLimp();
  }, [fetchPlanLimp]);

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      try {
        const [resEq, resSec] = await Promise.all([
          apiFetch(`/equipos/`),
          apiFetch(`/sectores/`),
        ]);
        if (!cancelado) {
          if (resEq.ok) setEquipos(await resEq.json());
          if (resSec.ok) setSectores(await resSec.json());
        }
      } catch {
        if (!cancelado) {
          setEquipos([]);
          setSectores([]);
        }
      }
    };
    fetchData();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setPlanLimp({ ...planLimpieza, [e.target.name]: e.target.value });
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasYNumeros(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
      return patron.test(nombre);
    }

    if (!planLimpieza.nombre.trim()) {
      setErrorMsg("El nombre del plan no puede estar vacío.");
      return;
    }

    if (planLimpieza.nombre.trim().length < 4) {
      setErrorMsg("El nombre debe tener al menos 4 caracteres.");
      return;
    }

    if (!soloLetrasYNumeros(planLimpieza.nombre)) {
      setErrorMsg("No se permiten caracteres especiales en el nombre.");
      return;
    }

    if (tipoObjetivo === 'equipo' && !planLimpieza.equipo_id) {
      setErrorMsg("Debe seleccionar un equipo.");
      return;
    }

    if (tipoObjetivo === 'sector' && !planLimpieza.sector_id) {
      setErrorMsg("Debe seleccionar un sector.");
      return;
    }

    const payload = {
      nombre: planLimpieza.nombre.trim(),
      ...(tipoObjetivo === 'equipo'
        ? { equipo_id: Number(planLimpieza.equipo_id), sector_id: null }
        : { sector_id: Number(planLimpieza.sector_id), equipo_id: null }),
    };

    setLoading(true);

    try {
      const res = await apiFetch(`/plan_De_limpieza/${planlimpiezaID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar el plan.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Plan de Limpieza fue Editado exitosamente");
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setPlanLimp(PLAN_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  const abrirConfirmacion = (tarea: TareaConId) => {
    setTareaAConfirmar(tarea);
    setDialogAbierto(true);
  };

  const ejecutarBajaTarea = async () => {
    if (!tareaAConfirmar) return;
    try {
      const res = await apiFetch(`/tareas/${tareaAConfirmar.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPlanLimp();
      } else {
        alert('No se pudo eliminar la tarea');
      }
    } catch {
      alert('Error de conexión al eliminar la tarea');
    } finally {
      setDialogAbierto(false);
      setTareaAConfirmar(null);
    }
  };

  return (
    <div className="plan-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Plan De Limpieza</h1>
        <div className="subtitulo">02 · Modificacion</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <div className="form-group">
        <label htmlFor="fecha_inicio">Fecha de Inicio</label>
        <div>{formatDate(planLimpieza.fecha_inicio)}</div>
      </div>

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Plan</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={planLimpieza.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo_objetivo">Asignado a:</label>
          <select
            id="tipo_objetivo"
            name="tipo_objetivo"
            value={tipoObjetivo}
            onChange={(e) => setTipoObjetivo(e.target.value as 'equipo' | 'sector')}
          >
            <option value="equipo">Equipo</option>
            <option value="sector">Sector</option>
          </select>
        </div>

        {tipoObjetivo === 'equipo' ? (
          <div className="form-group">
            <label htmlFor="equipo_id">Equipo</label>
            <select
              id="equipo_id"
              name="equipo_id"
              value={planLimpieza.equipo_id ?? ""}
              onChange={handleChange}
            >
              <option value="" disabled>Seleccione un equipo</option>
              {equipos.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="sector_id">Sector</label>
            <select
              id="sector_id"
              name="sector_id"
              value={planLimpieza.sector_id ?? ""}
              onChange={handleChange}
            >
              <option value="" disabled>Seleccione un sector</option>
              {sectores.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="listado-top-bar">
          <div className="modulo-header">
            <h2>Tareas</h2>
          </div>
          <div className="accion-agregar">
            <button type="button" className="btn-agregar" onClick={() => setModal(true)}>
              +Agregar Tarea
            </button>
          </div>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-custom">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Procedimiento</th>
                <th>Frecuencia</th>
                <th className="acciones-col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    Cargando Tareas...
                  </td>
                </tr>
              ) : planLimpieza.tareas?.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay Tareas registradas.
                  </td>
                </tr>
              ) : (
                planLimpieza.tareas?.map((t: TareaConId) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                    <td>{t.descripcion}</td>
                    <td>{t.frecuencia}</td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          type="button"
                          className="btn-icon btn-ver"
                          title="Ver detalles"
                          onClick={() => { setModelVer(true); setTareaSeleccionada(t.id); }}
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-editar"
                          title="Editar"
                          onClick={() => { setModalEditar(true); setTareaSeleccionada(t.id); }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-eliminar"
                          title="Dar de baja"
                          onClick={() => abrirConfirmacion(t)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="¿Dar de baja tarea?"
        description={`¿Estás seguro de que deseas eliminar la tarea "${tareaAConfirmar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Confirmar Baja"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarBajaTarea}
        onCancel={() => {
          setDialogAbierto(false);
          setTareaAConfirmar(null);
        }}
      />

      {modalAbierto && (
        <div className="modal-abierto">
          <div className="modal-content">
            <NuevaTarea
              planID={planLimpieza?.id}
              onSuccess={() => { setModal(false); fetchPlanLimp(); }}
              onCancel={() => setModal(false)}
            />
          </div>
        </div>
      )}

      {modalEditar && (
        <div className="modal-abierto">
          <div className="modal-content">
            <EditarTarea
              tareaID={tareaSeleccionada}
              planID={planLimpieza.id}
              onSuccess={() => { setModalEditar(false); fetchPlanLimp(); }}
              onCancel={() => setModalEditar(false)}
            />
          </div>
        </div>
      )}

      {modalVerTarea && (
        <div className="modal-abierto">
          <div className="modal-content">
            <VerTarea
              tareaID={tareaSeleccionada}
              onCancel={() => setModelVer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}