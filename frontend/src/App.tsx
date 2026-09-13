import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import VerInsumo from './views/insumos/verInsumo';
import EditarInsumo from './views/insumos/editarInsumo';
import type { InsumoConId } from './views/insumos/tipos';

function App() {
  const [vista, setVista] = useState<'listado' | 'alta' | 'ver' | 'editar'>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoConId | null>(null);

  const irAVer = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVista('ver');
  };

  const irAEditar = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVista('editar');
  };

  const volverAListado = () => {
    setInsumoSeleccionado(null);
    setVista('listado');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {vista === 'listado' && (
        <ListadoInsumos
          onNuevoClick={() => setVista('alta')}
          onVerClick={irAVer}
          onEditarClick={irAEditar}
        />
      )}

      {vista === 'alta' && (
        <NuevoInsumo
          onSuccess={volverAListado}
          onCancel={volverAListado}
        />
      )}

      {vista === 'ver' && insumoSeleccionado && (
        <VerInsumo
          insumo={insumoSeleccionado}
          onEditarClick={irAEditar}
          onVolver={volverAListado}
        />
      )}

      {vista === 'editar' && insumoSeleccionado && (
        <EditarInsumo
          insumo={insumoSeleccionado}
          onSuccess={volverAListado}
          onCancel={volverAListado}
        />
      )}
    </div>
  );
}

export default App;
