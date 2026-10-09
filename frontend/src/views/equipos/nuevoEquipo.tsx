import { useEffect, useRef, useState } from "react";
import type { Equipo } from "./tipos";
import type { Sector } from "../sectores/tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from '../../api/client';

const CATEGORIAS = ["conservamiento", "sanamiento", "mantenimiento", "desinfeccion"];
const EQUIPO_INICIAL: Equipo = {
  nombre: "",
  categoria: "",
  sector_id: "",
  plan_de_calibracion: "",
  estado: "activo",
};

interface NuevoEquipoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NuevoEquipo({ onSuccess, onCancel }: NuevoEquipoProps) {
  const [equipo, setEquipo] = useState<Equipo>(EQUIPO_INICIAL);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarSectores() {
      try {
        const res = await apiFetch('/sectores/');
        if (res.ok) {
          const data = await res.json();
          if (!cancelado) setSectores(data);
        }
      } catch {
        if (!cancelado) setSectores([]);
      }
    }
    cargarSectores();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setEquipo({ ...equipo, [e.target.name]: e.target.value });
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasyNumeros(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
      return patron.test(nombre);
    }

    if (!equipo.nombre.trim()) {
      setErrorMsg("El nombre del equipo no puede estar vacío.");
      return;
    }

    if (equipo.nombre.trim().length < 4) {
      setErrorMsg("El nombre debe tener al menos 4 caracteres.");
      return;
    }

    if (!equipo.sector_id) {
      setErrorMsg("Debe seleccionar un sector.");
      return;
    }

    if (!soloLetrasyNumeros(equipo.nombre)) {
      setErrorMsg("No se permiten numeros en el nombre.");
      return;
    }

    const payload = {
      nombre: equipo.nombre.trim(),
      categoria: equipo.categoria,
      sector_id: Number(equipo.sector_id),
      plan_de_calibracion: equipo.plan_de_calibracion.trim(),
      estado: "activo",
    };

    setLoading(true);

    try {
      const res = await apiFetch(`/equipos/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al guardar el equipo.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      dialog.current?.showModal();
      setSuccessMsg("Equipo dado de alta exitosamente");
      setEquipo(EQUIPO_INICIAL);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setEquipo(EQUIPO_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Equipo</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduzca el nombre del equipo"
            value={equipo.nombre}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="categoria">Categoría:</label>
          <select
            id="categoria"
            name="categoria"
            value={equipo.categoria}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione una categoría</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="sector_id">Ubicación (Sector)</label>
          <select
            id="sector_id"
            name="sector_id"
            value={equipo.sector_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Seleccione un sector</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="plan_de_calibracion">Plan de Calibración</label>
          <input
            id="plan_de_calibracion"
            name="plan_de_calibracion"
            type="text"
            value={equipo.plan_de_calibracion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      <dialog ref={dialog} className="guardado-con-exito">
        <h2>Equipo Guardado con Exito</h2>
        <button
          type="button"
          className="btn-guardar"
          onClick={() => {
            dialog.current?.close();
            onSuccess?.();
          }}
        >
          Aceptar
        </button>
      </dialog>
    </div>
  );
}