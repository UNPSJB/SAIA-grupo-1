import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import NuevoEquipo from './viewEquipos/nuevoEquipo';
import { ListadoEquipos } from './viewEquipos/listado';

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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <nav
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => cambiarModulo('insumos')}
          className={modulo === 'insumos' ? 'btn-guardar' : 'btn-cancelar'}
        >
          Insumos
        </button>
        <button
          onClick={() => cambiarModulo('equipos')}
          className={modulo === 'equipos' ? 'btn-guardar' : 'btn-cancelar'}
        >
          Equipos
        </button>
      </nav>

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
  );
}

export default App;
