import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';

export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
}

export const ProductosPublicos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { config } = useVistaPublica();

  useEffect(() => {
    async function cargarProductos() {
      try {
        const res = await apiFetch('/productos/publico');
        if (res.ok) {
          const data = await res.json();
          setProductos(data);
        } else {
          setError('No se pudo cargar el catálogo de productos.');
        }
      } catch (err) {
        console.error('Error al cargar productos en la vista pública:', err);
        setError('Error de conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    }

    if (config.verProductos) {
      cargarProductos();
    } else {
      setLoading(false);
    }
  }, [config.verProductos]);

  // Si la sección fue deshabilitada por el administrador, no renderiza nada según la HU
  if (!config.verProductos) return null;

  return (
    <div className="modulo-container dashboard-container" style={{ padding: '20px' }}>
      <div className="modulo-header">
        <h1>Catálogo de Productos</h1>
        <div className="subtitulo">Productos elaborados con garantía de calidad</div>
      </div>

      <div className="dashboard-card" style={{ width: '100%', marginTop: '20px', padding: '20px' }}>
        {loading ? (
          <p style={{ color: '#64748b' }}>Cargando catálogo de productos...</p>
        ) : error ? (
          <p style={{ color: 'var(--color-error, #ef4444)' }}>{error}</p>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
              No hay productos públicos habilitados para mostrar en este momento.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {productos.map((prod) => (
              <div
                key={prod.id}
                style={{
                  border: '1px solid var(--color-borde, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '16px',
                  backgroundColor: 'var(--color-superficie, #ffffff)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--color-texto, #333)' }}>
                      {prod.nombre}
                    </h3>
                    <span
                      style={{
                        fontSize: '12px',
                        backgroundColor: 'var(--color-suave, #f1f5f9)',
                        color: 'var(--color-texto-sec, #64748b)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {prod.unidadMedida}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '10px', lineHeight: '1.4' }}>
                    {prod.descripcion || 'Sin descripción disponible.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};