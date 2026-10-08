import { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import type { PlanDeCalibracionForm } from './tipos';
import type { EquipoConId } from '../equipos/tipos';
import { apiFetch } from '../../api/client';


const PLANCalibracion_INICIAL : PlanDeCalibracionForm = {
     nombre: "",
     equipo_id: "",
     fecha_mantenimiento: "",
     periodicidad_De_cambio: "",
     descripcion: ""
};


const HOY = new Date().toISOString().split("T")[0];


interface NuevoPlanDeCalibracionProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function NuevoPlanDeCalibracion({onSuccess, onCancel}: NuevoPlanDeCalibracionProps){
    const [planCalibracion, setPlanCalibracion] = useState<PlanDeCalibracionForm>(PLANCalibracion_INICIAL);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [equipos,setEquipos]= useState<EquipoConId[]>([]);
    const handleDescripcionChange = (
  e: React.ChangeEvent<HTMLTextAreaElement>
) => {
  handleChange(e);

  const target = e.target;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
};


function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setPlanCalibracion({...planCalibracion, [e.target.name]: e.target.value})

}

async function handleGuardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    function soloLetrasYNumeros(nombre:string): boolean{

        const patron=/^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s]+$/;
        return patron.test(nombre);
    }

    const numberPeriodicidad = Number(planCalibracion.periodicidad_De_cambio);

    if(!planCalibracion.nombre.trim()) {
        setErrorMsg("El nombre del plan no puede estar vacío.");
        return;
    }

    if(planCalibracion.nombre.trim().length < 1) {
        setErrorMsg("El nombre debe tener al menos 1 caracteres.");
        return;
    }


    if(!soloLetrasYNumeros(planCalibracion.nombre.trim())) {
        setErrorMsg("El nombre del plan solo puede contener letras y números.");
        return;
    }

    if(planCalibracion.fecha_mantenimiento < HOY) {
        setErrorMsg("La fecha de mantenimiento no puede ser anterior a la fecha actual.");
        return;
    }

    if(planCalibracion.periodicidad_De_cambio !== "" && Number(planCalibracion.periodicidad_De_cambio) < 0){
        setErrorMsg("La periodicidad debe ser un número positivo.");

        return
        
    }

    if(planCalibracion.descripcion.trim().length <1){

      setErrorMsg("la descripcion no puede estar vacia");
      return
    }


    const payload = {
        nombre: planCalibracion.nombre.trim(),
        equipo_id: Number(planCalibracion.equipo_id),
        fecha_mantenimiento: planCalibracion.fecha_mantenimiento,
        periodicidad_De_cambio: numberPeriodicidad,
        descripcion: planCalibracion.descripcion.trim()
    }

    setLoading(true);

    try {
        const res = await apiFetch(`/plan_de_calibracion/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if(!res.ok) {

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
    setSuccessMsg("Plan de Calibración dado de alta exitosamente");
    setPlanCalibracion(PLANCalibracion_INICIAL);
    onSuccess?.();



    }catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    }finally {
        setLoading(false);
    } 

}


useEffect(() => {
        const fetchEquipos = async () => {
            try {
                const res = await apiFetch(`/equipos/`);
                if (res.ok) {
                    const data = await res.json();
                    setEquipos(data);
                }
            } catch {
                setEquipos([]);
            }
        };
        fetchEquipos();
    }, []);


function handleCancelar() {
    setPlanCalibracion(PLANCalibracion_INICIAL);
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
}

return (

<div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Plan De Calibración</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar}>

        <div className="form-group">
          <label htmlFor="fecha_mantenimiento">Fecha de Mantenimiento</label>
          <input
            id="fecha_mantenimiento"
            name="fecha_mantenimiento"
            type="date"
            min={HOY}
            value={planCalibracion.fecha_mantenimiento}
            onChange={handleChange}
            required
          />
        </div>


        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Introduce el nombre"
            value={planCalibracion.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
            <label htmlFor="periodicidad_De_cambio">Periodicidad (días)</label>
            <input
                id="periodicidad_De_cambio"
                name="periodicidad_De_cambio"
                type="number"
                placeholder="Introduce la periodicidad en días"
                value={planCalibracion.periodicidad_De_cambio}
                onChange={handleChange}
                required
            />
        </div>

        <div className="form-group">
          <label htmlFor="equipo_id">Equipo</label>
          <select id="equipo_id" name="equipo_id" value={planCalibracion.equipo_id} onChange={handleChange} required>
            <option value="" disabled>Seleccione un equipo</option>
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </div>


        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            className="descripcion"
            id="descripcion"
            name="descripcion"
            rows={4}
            placeholder="Introduce la descripción"
            value={planCalibracion.descripcion}
            onChange={handleDescripcionChange}
            
            required
          />
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
      
    </div>
  );
}