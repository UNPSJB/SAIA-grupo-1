import { useState } from 'react';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';
import { DetallePersona } from './views/personas/verDetalle';
import { EditarPersona } from './views/personas/editarDetalle';

function App() {
  const [vista, setVista] = useState<'listado' | 'alta' | 'detalle' | 'editar'>('listado');
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<number | null>(null);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {vista === 'listado' ? (
        <ListadoPersonas
          onNuevoClick={() => setVista('alta')}
          onDetalleClick={(legajo) => {
            setLegajoSeleccionado(legajo);
            setVista('detalle');
          }}
          onEditarClick={(legajo) => {
            setLegajoSeleccionado(legajo);
            setVista('editar');
          }}
        />
      ) : vista === 'alta' ? (
        <NuevaPersona
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      ) : vista === 'detalle' ? (
        <DetallePersona
          personaLegajo={legajoSeleccionado}
          onCancel={() => setVista('listado')}
        />
      ) : (
        <EditarPersona
          personaLegajo={legajoSeleccionado}
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      )}
    </div>
  );
}

export default App;