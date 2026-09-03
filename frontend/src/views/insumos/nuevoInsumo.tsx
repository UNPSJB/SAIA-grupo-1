import { useState } from "react";
import type { Insumo } from "./tipos";
import "../../styles/formularioAlta.css"

export default function NuevoInsumo() {
  const [insumo, setInsumo] = useState<Insumo>({ nombre: "", unidad_medida: "" });
  const UNIDADES = ["kg", "g", "l", "ml", "unidad"];

function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  setInsumo({ ...insumo, [e.target.name]: e.target.value });
}

function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
  e.preventDefault();
  //logica para enviar el insumo al backend
  console.log(insumo);
}

return (
  <div className="contenedor-formulario">
    <h1>Nuevo Insumo</h1>
    <h3>02-Alta de insumo</h3>
    <form className="formulario" onSubmit={handleSubmit}>

      <div className="contenedorDato">
        <label htmlFor="nombre">Nombre:</label>
        <input className="contenedorInput"type="text" id="nombre" name="nombre" value={insumo.nombre} onChange={handleChange} />
      </div>

      <div className="contenedorDato">
        <label htmlFor="unidad_medida">Unidad de Medida:</label>
        <select className="contenedorSelect" id="unidad_medida" name="unidad_medida" value={insumo.unidad_medida} onChange={handleChange}>
          <option value="" disabled>Seleccione una unidad</option>
          {UNIDADES.map((unidad) => (
            <option key={unidad} value={unidad}>
              {unidad}
            </option>
          ))}
        </select>
      </div>

      <div className="ContenedorBotones">
        <button className="boton boton-guardar" type="submit">Guardar</button>
        <button className="boton boton-cancelar" type="button" onClick={() => setInsumo({ nombre: "", unidad_medida: "" })}>Cancelar</button>
      </div>


    </form>
  
  </div>


)

}


