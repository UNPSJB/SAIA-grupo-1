import React, { useEffect } from 'react';
import '../../styles/formularioAlta.css';
import { useVistaPublica } from './contextDeVistaPublica';
import { useParams } from 'react-router-dom';
import { useSnapshotVistaPublica } from './snapshotClient';

export const AcercaDeNosotros: React.FC = () => {
  const { config, setConfig } = useVistaPublica();
  const { identificadorId } = useParams<{ identificadorId: string }>();
  const { snapshot, cargando, qrValido } = useSnapshotVistaPublica(identificadorId);

  useEffect(() => {
    if (snapshot?.qr && qrValido) {
      setConfig(prev => ({
        ...prev,
        verAcercaDeNosotros: snapshot.qr!.config.verAcercaDeNosotros,
      }));
    }
  }, [snapshot, qrValido, setConfig]);

  const descripcion = qrValido ? (snapshot?.acerca_de_nosotros?.descripcion ?? '') : '';
  const loading = cargando;
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