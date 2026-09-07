import { useState } from 'react'
import NuevoEquipo from './viewEquipos/nuevoEquipo'
import {DetalleEquipo} from './viewEquipos/verDetalle'
import { ListadoEquipos } from './viewEquipos/listado'

function App() {
  const [vista, setVista] = useState<'listado' | 'alta' | 'detalle'>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {vista === 'listado' ? (
        <ListadoEquipos
          onNuevoClick={() => setVista('alta')} 
          onDetalleClick={(id) => {
            setEquipoSeleccionado(id);
            setVista('detalle');
          }}/>
      ):vista==='alta' ? (
      <NuevoEquipo 
      onSuccess={() => setVista('listado')}
      onCancel={() => setVista('listado')}
      />
      ):(
      <DetalleEquipo 
      equipoId={equipoSeleccionado}
      onCancel={() => setVista('listado')}
      />
      )}
      
    </div>
  );
}

export default App;