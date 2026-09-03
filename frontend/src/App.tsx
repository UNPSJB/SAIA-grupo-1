import { useState } from 'react';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';

function App() {
  const [vista, setVista] = useState<'listado' | 'alta'>('listado');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {vista === 'listado' ? (
        <ListadoPersonas onNuevoClick={() => setVista('alta')} />
      ) : (
        <NuevaPersona
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      )}
    </div>
  );
}

export default App;