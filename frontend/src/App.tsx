import { useState } from 'react';
import { ListadoPersonas } from './views/personas/listado';
import { NuevaPersona } from './views/personas/nuevaPersona';
import type { Persona } from './views/personas/tipos';

function App() {
  const [vista, setVista] = useState<'listado' | 'alta' | 'detalle' | 'editar'>('listado');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg, #f7f7f7)' }}>
      {vista === 'listado' ? (
        <ListadoPersonas
          onNuevoClick={() => {
            setPersonaSeleccionada(null);
            setVista('alta');
          }}
          onDetalleClick={(persona) => {
            setPersonaSeleccionada(persona);
            setVista('detalle');
          }}
          onEditarClick={(persona) => {
            setPersonaSeleccionada(persona);
            setVista('editar');
          }}
        />
      ) : vista === 'alta' ? (
        <NuevaPersona
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      ) : vista === 'detalle' ? (
        <NuevaPersona
          persona={personaSeleccionada}
          modoSoloLectura={true}
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      ) : (
        <NuevaPersona
          persona={personaSeleccionada}
          onSuccess={() => setVista('listado')}
          onCancel={() => setVista('listado')}
        />
      )}
    </div>
  );
}

export default App;