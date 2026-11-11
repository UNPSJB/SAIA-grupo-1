import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';
import type { ProductoPublico } from '../producto/tipos';

// Catálogo que ve cualquiera que abre el QR: solo los productos que el administrador eligió mostrar
export const ProductosPublicos: React.FC = () => {
  const { identificadorId } = useParams<{ identificadorId: string }>();
  const { config, setConfig } = useVistaPublica();
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      if (!identificadorId) return;
      try {
        // se consulta cada vez que se entra, así los cambios del administrador se ven al instante
        const [resQR, resProductos] = await Promise.all([
          apiFetch(`/identificadorQR/verificar/${identificadorId}`),
          apiFetch(`/identificadorQR/${identificadorId}/productos`),
        ]);
        if (resQR.ok) {
          const data = await resQR.json();
          if (typeof data.verProductos === 'boolean') {
            setConfig(prev => ({ ...prev, verProductos: data.verProductos }));
          }
        }
        if (!resProductos.ok) throw new Error("No se pudo cargar el catálogo de productos.");
        setProductos(await resProductos.json());
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [identificadorId, setConfig]);

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
            <div key={p.id} className="dashboard-card" style={{ padding: '18px' }}>
              <h2 style={{ fontSize: '1.05rem', margin: '0 0 6px 0' }}>{p.nombre}</h2>
              {p.descripcion && (
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--color-texto, #333)' }}>
                  {p.descripcion}
                </p>
              )}
              <span className="shadcn-badge shadcn-badge-secondary" style={{ textTransform: 'capitalize' }}>
                {p.unidadMedida}
                {p.unidad_medida_abreviatura ? ` (${p.unidad_medida_abreviatura})` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
