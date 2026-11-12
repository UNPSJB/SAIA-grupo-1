import { useEffect, useState } from "react";
import type { ClaseFuncional, RecetaDetalleConId, RecetaDetalleForm } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";
import { usePersonalActivo } from "../tareas/usePersonalActivo";
interface InsumoOption {
  id: number;
  nombre: string;
  unidad_medida?: string;
}

const DETALLE_INICIAL: RecetaDetalleForm = {
  ingrediente_id: "",
  nombre: "",
  cantidad: "",
  unidad_medida: "",
  es_aditivo: false,
  clase_funcional: "",
  numero_ins: "",
  operario_legajo: "",
  descripcion_pasos: "",
};

const CLASES_FUNCIONALES: ClaseFuncional[] = [
  "conservante",
  "antioxidante",
  "colorante",
  "edulcorantes",
];

interface NuevoDetalleRecetaProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onAgregarLocal?: (detalle: RecetaDetalleConId) => void;
}

export default function NuevoDetalleReceta({
  onAgregarLocal,
  onSuccess,
  onCancel,
}: NuevoDetalleRecetaProps) {
  const [detalle, setDetalle] = useState<RecetaDetalleForm>(DETALLE_INICIAL);
  const [insumos, setInsumos] = useState<InsumoOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const personas = usePersonalActivo();

  useEffect(() => {
    let cancelado = false;
    const fetchInsumos = async () => {
      try {
        const res = await apiFetch(`/insumos/`);
        if (!cancelado && res.ok) {
          setInsumos(await res.json());
        }
      } catch {
        if (!cancelado) setInsumos([]);
      }
    };
    fetchInsumos();
    return () => {
      cancelado = true;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setDetalle((prev) => ({
        ...prev,
        es_aditivo: checked,
        clase_funcional: checked ? prev.clase_funcional : "",
        numero_ins: checked ? prev.numero_ins : "",
      }));
      return;
    }

    setDetalle((prev) => ({ ...prev, [name]: value }));
  }

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    function soloLetrasYNumeros(nombre: string): boolean {
      const patron = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
      return patron.test(nombre);
    }

    if (!detalle.nombre.trim()) {
      setErrorMsg("El nombre de la etapa no puede estar vacío.");
      return;
    }

    if (detalle.nombre.trim().length < 2) {
      setErrorMsg("El nombre de la etapa debe tener al menos 2 caracteres.");
      return;
    }

    if (!soloLetrasYNumeros(detalle.nombre)) {
      setErrorMsg("No se permiten caracteres especiales en el nombre de la etapa.");
      return;
    }

    if (!detalle.ingrediente_id) {
      setErrorMsg("Debe seleccionar un ingrediente / insumo.");
      return;
    }

    if (detalle.cantidad === "" || Number(detalle.cantidad) <= 0) {
      setErrorMsg("La cantidad tiene que ser mayor a 0.");
      return;
    }

    if (!detalle.unidad_medida.trim()) {
      setErrorMsg("La unidad de medida no puede estar vacía.");
      return;
    }

    if (detalle.es_aditivo) {
      if (!detalle.clase_funcional) {
        setErrorMsg("El aditivo tiene que tener una clase funcional.");
        return;
      }
      const esAromatizante = detalle.clase_funcional.toLowerCase().includes("aromatizante");
      if (!esAromatizante && !detalle.numero_ins.trim()) {
        setErrorMsg("El aditivo tiene que tener un número INS.");
        return;
      }
    }

    if (!detalle.operario_legajo) {
      setErrorMsg("Debe asignar el operario a cargo de la etapa.");
      return;
    }

    if (!detalle.descripcion_pasos.trim()) {
      setErrorMsg("La descripción de pasos no puede estar vacía.");
      return;
    }

    const asignado = personas.find((p) => p.legajo === Number(detalle.operario_legajo));
    const insumoSeleccionado = insumos.find((i) => i.id === Number(detalle.ingrediente_id));

    onAgregarLocal?.({
      id: Date.now(), // ID temporal para la key de la tabla en React antes de guardar la receta
      version_receta_id: 0,
      nombre: detalle.nombre.trim(),
      ingrediente_id: Number(detalle.ingrediente_id),
      nombre_ingrediente: insumoSeleccionado ? insumoSeleccionado.nombre : null,
      cantidad: Number(detalle.cantidad),
      unidad_medida: detalle.unidad_medida.trim(),
      es_aditivo: detalle.es_aditivo,
      clase_funcional: detalle.es_aditivo && detalle.clase_funcional ? detalle.clase_funcional : null,
      numero_ins: detalle.es_aditivo && detalle.numero_ins.trim() ? detalle.numero_ins.trim() : null,
      operario_legajo: Number(detalle.operario_legajo),
      nombre_operario: asignado ? `${asignado.nombre} ${asignado.apellido}` : null,
      descripcion_pasos: detalle.descripcion_pasos.trim(),
    });

    setDetalle(DETALLE_INICIAL);
    onSuccess?.();
  }

  function handleCancelar() {
    setDetalle(DETALLE_INICIAL);
    setErrorMsg(null);
    onCancel?.();
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nueva Etapa de Receta</h1>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Etapa</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Etapa 1 Amasado"
            value={detalle.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="ingrediente_id">Ingrediente / Insumo</label>
          <select
            id="ingrediente_id"
            name="ingrediente_id"
            value={detalle.ingrediente_id}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione un insumo
            </option>
            {insumos.map((ins) => (
              <option key={ins.id} value={ins.id}>
                {ins.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cantidad">Cantidad</label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            step="any"
            min="0.01"
            placeholder="Introduce la cantidad"
            value={detalle.cantidad}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <input
            id="unidad_medida"
            name="unidad_medida"
            type="text"
            placeholder="Ej: kg, g, ml, l"
            value={detalle.unidad_medida}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            id="es_aditivo"
            name="es_aditivo"
            type="checkbox"
            checked={detalle.es_aditivo}
            onChange={handleChange}
            style={{ width: "auto", margin: 0 }}
          />
          <label htmlFor="es_aditivo" style={{ margin: 0 }}>
            ¿Es Aditivo?
          </label>
        </div>

        {detalle.es_aditivo && (
          <>
            <div className="form-group">
              <label htmlFor="clase_funcional">Clase Funcional</label>
              <select
                id="clase_funcional"
                name="clase_funcional"
                value={detalle.clase_funcional}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Seleccione la clase funcional
                </option>
                {CLASES_FUNCIONALES.map((cf) => (
                  <option key={cf} value={cf}>
                    {cf}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numero_ins">Número INS</label>
              <input
                id="numero_ins"
                name="numero_ins"
                type="text"
                placeholder="Ej: INS 282"
                value={detalle.numero_ins}
                onChange={handleChange}
                required
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="operario_legajo">Operario a Cargo</label>
          <select
            id="operario_legajo"
            name="operario_legajo"
            value={detalle.operario_legajo}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione un operador activo
            </option>
            {personas.map((p) => (
              <option key={p.legajo} value={p.legajo}>
                {p.apellido}, {p.nombre} (Legajo: {p.legajo})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion_pasos">Procedimiento / Pasos</label>
          <textarea
            id="descripcion_pasos"
            name="descripcion_pasos"
            placeholder="Introduce los pasos del procedimiento"
            value={detalle.descripcion_pasos}
            onChange={handleChange}
            rows={4}
            required
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar">
            Guardar
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}