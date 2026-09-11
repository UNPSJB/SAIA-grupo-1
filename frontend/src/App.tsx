import { useState } from 'react'
import NuevoEquipo from './viewEquipos/nuevoEquipo'
import {DetalleEquipo} from './viewEquipos/VerDetalle'
import EditarEquipo from './viewEquipos/editarDetalle'
import { ListadoEquipos } from './viewEquipos/listado'
import EliminarEquipo from './viewEquipos/eliminarEquipo'

function App() {
  const [vista, setVista] = useState<'listado' | 'alta' | 'detalle'| 'editar' | 'eliminar'>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {vista === 'listado' ? (
        <ListadoEquipos
          onNuevoClick={() => setVista('alta')} 
          onDetalleClick={(id) => {
            setEquipoSeleccionado(id)
            setVista('detalle')
          }}
          onEditarClick={(id) => {setEquipoSeleccionado(id);
            setVista('editar')} }
          onEliminarClick={(id)=> {setEquipoSeleccionado(id);
            setVista('eliminar');}}/>
      ):vista==='alta' ? (
      <NuevoEquipo 
      onSuccess={() => setVista('listado')}
      onCancel={() => setVista('listado')}
      />
      ): vista === 'detalle' ? (
      <DetalleEquipo 
      equipoId={equipoSeleccionado}
      onCancel={() => setVista('listado')}
      />
      ): vista==='editar'?(
        <EditarEquipo
        equipoId={equipoSeleccionado}
        onSuccess={() => setVista('listado')}
        onCancel={() => setVista('listado')}
        />
      ): (
        <EliminarEquipo
        equipoID={equipoSeleccionado}
        onCancel={() => setVista('listado')}
        onSucces={()=> setVista('listado')}/>
      )}
      
    </div>
  );
}

export default App;