import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import VerInsumo from './views/insumos/verInsumo';
import EditarInsumo from './views/insumos/editarInsumo';
import type { InsumoConId } from './views/insumos/tipos';
import NuevoEquipo from './views/equipos/nuevoEquipo';
import { ListadoEquipos } from './views/equipos/listado';
import { DetalleEquipo } from './views/equipos/verDetalle';
import EditarEquipo from './views/equipos/editarDetalle';
import EliminarEquipo from './views/equipos/eliminarEquipo';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';
import { DetallePersona } from './views/personas/verDetalle';
import { EditarPersona } from './views/personas/editarDetalle';
import { Sidebar } from './components/Sidebar';

type Modulo = 'insumos' | 'equipos' | 'personas';
type VistaEquipos = 'listado' | 'alta' | 'detalle' | 'editar' | 'eliminar';
type VistaInsumos = 'listado' | 'alta' | 'ver' | 'editar';
type VistaPersonas = 'listado' | 'alta' | 'detalle' | 'editar';

function App() {
  const [modulo, setModulo] = useState<Modulo>('insumos');
  const [vistaEquipos, setVistaEquipos] = useState<VistaEquipos>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);
  const [vistaInsumos, setVistaInsumos] = useState<VistaInsumos>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoConId | null>(null);
  const [vistaPersonas, setVistaPersonas] = useState<VistaPersonas>('listado');
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<number | null>(null);

  const cambiarModulo = (nuevoModulo: Modulo) => {
    setModulo(nuevoModulo);
    setVistaEquipos('listado');
    setVistaInsumos('listado');
    setVistaPersonas('listado');
  };

  const irAVerInsumo = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVistaInsumos('ver');
  };

  const irAEditarInsumo = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVistaInsumos('editar');
  };

  const volverAListadoInsumos = () => {
    setInsumoSeleccionado(null);
    setVistaInsumos('listado');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex' }}>
      <Sidebar moduloActivo={modulo} onCambiarModulo={cambiarModulo} />

      <div style={{ flex: 1 }}>
        {modulo === 'insumos' ? (
          vistaInsumos === 'listado' ? (
            <ListadoInsumos
              onNuevoClick={() => setVistaInsumos('alta')}
              onVerClick={irAVerInsumo}
              onEditarClick={irAEditarInsumo}
            />
          ) : vistaInsumos === 'alta' ? (
            <NuevoInsumo
              onSuccess={volverAListadoInsumos}
              onCancel={volverAListadoInsumos}
            />
          ) : vistaInsumos === 'ver' && insumoSeleccionado ? (
            <VerInsumo
              insumo={insumoSeleccionado}
              onEditarClick={irAEditarInsumo}
              onVolver={volverAListadoInsumos}
            />
          ) : insumoSeleccionado ? (
            <EditarInsumo
              insumo={insumoSeleccionado}
              onSuccess={volverAListadoInsumos}
              onCancel={volverAListadoInsumos}
            />
          ) : null
        ) : modulo === 'equipos' ? (
          vistaEquipos === 'listado' ? (
            <ListadoEquipos
              onNuevoClick={() => setVistaEquipos('alta')}
              onDetalleClick={(id) => {
                setEquipoSeleccionado(id);
                setVistaEquipos('detalle');
              }}
              onEditarClick={(id) => {
                setEquipoSeleccionado(id);
                setVistaEquipos('editar');
              }}
              onEliminarClick={(id) => {
                setEquipoSeleccionado(id);
                setVistaEquipos('eliminar');
              }}
            />
          ) : vistaEquipos === 'alta' ? (
            <NuevoEquipo
              onSuccess={() => setVistaEquipos('listado')}
              onCancel={() => setVistaEquipos('listado')}
            />
          ) : vistaEquipos === 'detalle' ? (
            <DetalleEquipo
              equipoId={equipoSeleccionado}
              onCancel={() => setVistaEquipos('listado')}
            />
          ) : vistaEquipos === 'editar' ? (
            <EditarEquipo
              equipoId={equipoSeleccionado}
              onSuccess={() => setVistaEquipos('listado')}
              onCancel={() => setVistaEquipos('listado')}
            />
          ) : (
            <EliminarEquipo
              equipoID={equipoSeleccionado}
              onCancel={() => setVistaEquipos('listado')}
              onSucces={() => setVistaEquipos('listado')}
            />
          )
        ) : vistaPersonas === 'listado' ? (
          <ListadoPersonas
            onNuevoClick={() => setVistaPersonas('alta')}
            onDetalleClick={(legajo) => {
              setLegajoSeleccionado(legajo);
              setVistaPersonas('detalle');
            }}
            onEditarClick={(legajo) => {
              setLegajoSeleccionado(legajo);
              setVistaPersonas('editar');
            }}
          />
        ) : vistaPersonas === 'alta' ? (
          <NuevaPersona
            onSuccess={() => setVistaPersonas('listado')}
            onCancel={() => setVistaPersonas('listado')}
          />
        ) : vistaPersonas === 'detalle' ? (
          <DetallePersona
            personaLegajo={legajoSeleccionado}
            onCancel={() => setVistaPersonas('listado')}
          />
        ) : (
          <EditarPersona
            personaLegajo={legajoSeleccionado}
            onSuccess={() => setVistaPersonas('listado')}
            onCancel={() => setVistaPersonas('listado')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
