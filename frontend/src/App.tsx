import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import NuevoEquipo from './viewEquipos/nuevoEquipo';
import { ListadoEquipos } from './viewEquipos/listado';
import { Sidebar } from './components/Sidebar';

type Modulo = 'insumos' | 'equipos';
type Vista = 'listado' | 'alta';

function App() {
  const [modulo, setModulo] = useState<Modulo>('insumos');
  const [vista, setVista] = useState<Vista>('listado');

  const cambiarModulo = (nuevoModulo: Modulo) => {
    setModulo(nuevoModulo);
    setVista('listado');
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
        ) : vista === 'listado' ? (
          <ListadoEquipos onNuevoClick={() => setVista('alta')} />
        ) : (
          <NuevoEquipo
            onSuccess={() => setVista('listado')}
            onCancel={() => setVista('listado')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
