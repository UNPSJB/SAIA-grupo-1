import { useEffect, useState } from "react";
import "../../styles/formularioAlta.css";
import { apiFetch } from '../../api/client';
import type { TipoInsumo } from '../tipoInsumo/tipos';
import type { Proveedor } from '../proveedores/tipos';

interface NuevoInsumoProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const obtenerFechaLocal = (fecha: Date = new Date()): string => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const getMinVencimiento = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return obtenerFechaLocal(d);
};

export default function NuevoInsumo({ onSuccess, onCancel }: NuevoInsumoProps) {
  const [tipos, setTipos] = useState<TipoInsumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tipoSeleccionadoId, setTipoSeleccionadoId] = useState<number | "">("");
  const [proveedorSeleccionadoId, setProveedorSeleccionadoId] = useState<number | "">("");
  const [nombre, setNombre] = useState("");
  const [lote, setLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState(getMinVencimiento());
  const [cantRecibida, setCantRecibida] = useState<number | "">("");
  const [unidadMedida, setUnidadMedida] = useState("");

  const [loading, setLoading] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarCatalogos() {
      try {
        const [resTipos, resProvs] = await Promise.all([
          apiFetch('/insumos/tipos/?solo_activos=true'),
          apiFetch('/proveedores/?solo_activos=true'),
        ]);

        if (!cancelado && resTipos.ok) {
          const dataTipos = await resTipos.json();
          setTipos(dataTipos);
        }
        if (!cancelado && resProvs.ok) {
          const dataProvs = await resProvs.json();
          setProveedores(dataProvs);
        }
      } catch {
        if (!cancelado) setErrorMsg("Error de conexión al cargar catálogos.");
      } finally {
        if (!cancelado) setCargandoCatalogos(false);
      }
    }
    cargarCatalogos();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleTipoChange(tipoIdNum: number) {
    setTipoSeleccionadoId(tipoIdNum);
    const encontrado = tipos.find((t) => t.id === tipoIdNum);
    if (encontrado) {
      setUnidadMedida(encontrado.unidadMedida);
      if (!nombre) {
        setNombre(encontrado.nombre);
      }
    } else {
      setUnidadMedida("");
    }
  }

  async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (tipoSeleccionadoId === "") {
      setErrorMsg("Debe seleccionar un Tipo de Insumo.");
      return;
    }

    if (proveedorSeleccionadoId === "") {
      setErrorMsg("Debe seleccionar un Proveedor.");
      return;
    }

    const loteLimpio = lote.trim();
    if (!loteLimpio) {
      setErrorMsg("El código de lote es obligatorio.");
      return;
    }

    if (cantRecibida === "" || Number(cantRecibida) <= 0) {
      setErrorMsg("La cantidad recibida debe ser estrictamente mayor a cero.");
      return;
    }

    const minVenc = getMinVencimiento();
    if (!fechaVencimiento || fechaVencimiento < minVenc) {
      setErrorMsg("La fecha de vencimiento es obligatoria y debe ser al menos 7 días posterior a la recepción.");
      return;
    }

    setLoading(true);

    const payload = {
      tipo_insumo_id: Number(tipoSeleccionadoId),
      proveedor_id: Number(proveedorSeleccionadoId),
      lote: loteLimpio,
      nombre: nombre.trim() || undefined,
      fechaVencimiento: fechaVencimiento,
      cantRecibida: Number(cantRecibida),
    };

    try {
      let res = await apiFetch(`/insumos/recepcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 403 || res.status === 404) {
        res = await apiFetch(`/insumos-operador/recepcion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let mensaje = "Error al registrar la recepción del insumo.";
        if (typeof errorData.detail === "string") {
          mensaje = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          mensaje = errorData.detail
            .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
            .join(", ");
        }
        throw new Error(mensaje);
      }

      setSuccessMsg("Recepción de insumo registrada exitosamente con stock disponible.");
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  }

  if (cargandoCatalogos) {
    return (
      <div className="modulo-container formulario-box">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando catálogo de tipos y proveedores...</p>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Recepción de Insumo</h1>
        <div className="subtitulo">Registro de lote recibido y control de vencimiento</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="tipo_insumo_id">Tipo de Insumo *</label>
          <select
            id="tipo_insumo_id"
            name="tipo_insumo_id"
            value={tipoSeleccionadoId}
            onChange={(e) => handleTipoChange(Number(e.target.value))}
            required
          >
            <option value="" disabled>Seleccione un tipo genérico...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({t.unidadMedida})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="proveedor_id">Proveedor *</label>
          <select
            id="proveedor_id"
            name="proveedor_id"
            value={proveedorSeleccionadoId}
            onChange={(e) => setProveedorSeleccionadoId(Number(e.target.value))}
            required
          >
            <option value="" disabled>Seleccione el proveedor...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.cuit ? `(CUIT: ${p.cuit})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nombre">Nombre Específico / Marca</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Harina 000 Pureza, Manteca La Serenísima..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="lote">Código de Lote *</label>
          <input
            id="lote"
            name="lote"
            type="text"
            placeholder="Ej: HAR3-2410"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">Fecha de Vencimiento (Mínimo 7 días posteriores) *</label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            min={getMinVencimiento()}
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cantRecibida">
            Cantidad Recibida {unidadMedida ? `(${unidadMedida})` : ''} *
          </label>
          <input
            id="cantRecibida"
            name="cantRecibida"
            type="number"
            min="0.01"
            step="any"
            placeholder={unidadMedida ? `Cantidad en ${unidadMedida}` : "Introduce la cantidad"}
            value={cantRecibida}
            onChange={(e) => setCantRecibida(e.target.value === "" ? "" : Number(e.target.value))}
            required
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? "Registrando recepción..." : "Registrar Recepción"}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
