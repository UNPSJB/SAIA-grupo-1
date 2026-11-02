import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { useVistaPublica } from './contextDeVistaPublica';
import { useParams } from 'react-router-dom';

export const AcercaDeNosotros: React.FC = () => {
  const [descripcion, setDescripcion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  
  const { config, setConfig } = useVistaPublica();
  const { identificadorId } = useParams<{ identificadorId: string }>();

  useEffect(() => {
    const sincronizarEstadoQR = async () => {
      if (!identificadorId) return;
      try {
        const res = await apiFetch(`/identificadorQR/verificar/${identificadorId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (typeof data.verAcercaDeNosotros === 'boolean') {
            setConfig(prev => ({ ...prev, verAcercaDeNosotros: data.verAcercaDeNosotros }));
          }
        }
      } catch (err) {
        console.error("Error al sincronizar el estado del QR:", err);
      }
    };

    sincronizarEstadoQR();
  }, [identificadorId, setConfig]);

  useEffect(() => {
    async function cargarAcercaDeNosotros() {
      try {
        const res = await apiFetch(`/acercaDeNosotros/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.descripcion) {
            setDescripcion(data.descripcion);
          }
        }
      } catch (err) {
        console.error("Error al cargar la información institucional:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarAcercaDeNosotros();
  }, []);
  return (
    <div className="modulo-container dashboard-container" style={{ padding: '20px' }}>
      <div className="modulo-header">
        <h1>Nosotros</h1>
        <div className="subtitulo">Conoce más sobre nuestros objetivos</div>
      </div>

      <div className="dashboard-card" style={{ width: '100%', marginTop: '20px', padding: '20px' }}>
        {loading ? (
          <p>Cargando información...</p>
        ) : config.verAcercaDeNosotros ? (
          <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--color-texto, #333)', whiteSpace: 'pre-wrap' }}>
            {descripcion || "No hay información institucional registrada por el momento."}
          </p>
        ) : (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>
            Esta sección se encuentra temporalmente deshabilitada por la administración.
          </p>
        )}
      </div>
    </div>
  );
};