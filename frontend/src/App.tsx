import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import NuevoEquipo from './viewEquipos/nuevoEquipo';
import { ListadoEquipos } from './viewEquipos/listado';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';
import { DetallePersona } from './views/personas/verDetalle';
import { EditarPersona } from './views/personas/editarDetalle';
import { Sidebar } from './components/Sidebar';

type Modulo = 'insumos' | 'equipos' | 'personas';
type Vista = 'listado' | 'alta';
type VistaPersonas = 'listado' | 'alta' | 'detalle' | 'editar';

function App() {
  const [modulo, setModulo] = useState<Modulo>('insumos');
  const [vista, setVista] = useState<Vista>('listado');
  const [vistaPersonas, setVistaPersonas] = useState<VistaPersonas>('listado');
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<number | null>(null);

  const cambiarModulo = (nuevoModulo: Modulo) => {
    setModulo(nuevoModulo);
    setVista('listado');
    setVistaPersonas('listado');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex' }}>
      <Sidebar moduloActivo={modulo} onCambiarModulo={cambiarModulo} />

      <div style={{ flex: 1 }}>
        {modulo === 'insumos' ? (
          vista === 'listado' ? (
            <ListadoInsumos onNuevoClick={() => setVista('alta')} />
          ) : (
            <NuevoInsumo
              onSuccess={() => setVista('listado')}
              onCancel={() => setVista('listado')}
            />
          )
        ) : modulo === 'equipos' ? (
          vista === 'listado' ? (
            <ListadoEquipos onNuevoClick={() => setVista('alta')} />
          ) : (
            <NuevoEquipo
              onSuccess={() => setVista('listado')}
              onCancel={() => setVista('listado')}
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
