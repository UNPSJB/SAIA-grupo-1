import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';

function App() {
  const [vista, setVista] = useState<'listado' | 'alta'>('listado');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {vista === 'listado' ? (
        <ListadoInsumos onNuevoClick={() => setVista('alta')} />
      ) : (
        <NuevoInsumo
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      )}
    </div>
  );
}

export default App;
