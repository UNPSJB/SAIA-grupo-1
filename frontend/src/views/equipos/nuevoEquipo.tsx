import { useEffect, useState } from "react";
import type { Equipo } from "./tipos";
import type { Sector } from "../sectores/tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from '../../api/client';
import { SuccessAlertDialog } from '../../components/ui/alert-dialog';

const CATEGORIAS = ["conservamiento", "sanamiento", "mantenimiento", "desinfeccion"];
const EQUIPO_INICIAL: Equipo = {
  nombre: "",
  categoria: "",
  sector_id: "",
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
  const [exitoDialogAbierto, setExitoDialogAbierto] = useState(false);

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
      setErrorMsg("No se permiten caracteres especiales en el nombre.");
      return;
    }

    const payload = {
      nombre: equipo.nombre.trim(),
      categoria: equipo.categoria,
      sector_id: Number(equipo.sector_id),
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

      setSuccessMsg("Equipo dado de alta exitosamente");
      setEquipo(EQUIPO_INICIAL);
      setExitoDialogAbierto(true);
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

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      <SuccessAlertDialog
        open={exitoDialogAbierto}
        title="Equipo dado de alta"
        description="El nuevo equipo fue registrado correctamente en el sistema."
        onClose={() => {
          setExitoDialogAbierto(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}