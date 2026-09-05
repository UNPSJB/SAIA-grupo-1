import { useState } from 'react'
import NuevoEquipo from './viewEquipos/nuevoEquipo'
import { ListadoEquipos } from './viewEquipos/listado'

function App() {
  const [vista, setVista] = useState<'listado' | 'alta'>('listado');

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {vista === 'listado' ? (
        <ListadoEquipos onNuevoClick={() => setVista('alta')} />
      ): (
      <NuevoEquipo 
      onSuccess={() => setVista('listado')}
      onCancel={() => setVista('listado')}
      />
      )}
      
    </div>
  );
}

export default App;