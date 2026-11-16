import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../../styles/formularioAlta.css';
import { useVistaPublica } from './contextDeVistaPublica';
import { useSnapshotVistaPublica } from './snapshotClient';

export const ProductosPublicos: React.FC = () => {
  const { identificadorId } = useParams<{ identificadorId: string }>();
  const { config, setConfig } = useVistaPublica();
  const { snapshot, cargando, qrValido, errorMsg } = useSnapshotVistaPublica(identificadorId);

  useEffect(() => {
    if (snapshot?.qr && qrValido) {
      setConfig(prev => ({
        ...prev,
        verProductos: snapshot.qr!.config.verProductos,
      }));
    }
  }, [snapshot, qrValido, setConfig]);

  const productos = qrValido && snapshot ? snapshot.productos : [];
  const loading = cargando;

  return (
    <div className="modulo-container dashboard-container" style={{ padding: '20px' }}>
      <div className="modulo-header">
        <h1>Productos</h1>
        <div className="subtitulo">Conocé los productos que elaboramos</div>
      </div>

      {loading ? (
        <div className="dashboard-card" style={{ marginTop: '20px' }}><p>Cargando productos...</p></div>
      ) : errorMsg ? (
        <div className="alerta-error" style={{ marginTop: '20px' }}>{errorMsg}</div>
      ) : !config.verProductos ? (
        <div className="dashboard-card" style={{ marginTop: '20px' }}>
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>
            Esta sección se encuentra temporalmente deshabilitada por la administración.
          </p>
        </div>
      ) : productos.length === 0 ? (
        <div className="dashboard-card" style={{ marginTop: '20px' }}>
          <p>Por el momento no hay productos para mostrar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {productos.map(p => (
            <div key={p.id} className="dashboard-card" style={{ padding: '18px', justifyContent: 'flex-start', minHeight: 'auto', gap: '8px' }}>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>{p.nombre}</h2>
              {p.descripcion && (
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--color-texto, #333)' }}>
                  {p.descripcion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
