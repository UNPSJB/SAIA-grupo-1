import React, { useEffect, useState } from 'react';
import type { RecetaConId, RecetaDetalleConId } from './tipos';
import '../../styles/formularioAlta.css';
import { VerDetalleReceta } from './VerEtapaReceta';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent } from '../../components/ui/dialog';

interface DetalleRecetaProps {
  onCancel?: () => void;
  recetaID?: number | null;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'No aplica';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
  } catch {
    return dateStr;
  }
};

export const VerReceta: React.FC<DetalleRecetaProps> = ({
  onCancel,
  recetaID,
}) => {
  const [receta, setReceta] = useState<RecetaConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVerEtapa, setModalVerEtapa] = useState(false);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<RecetaDetalleConId | null>(null);

  useEffect(() => {
    if (!recetaID) return;
    let cancelado = false;
    const fetchReceta = async () => {
      try {
        const res = await apiFetch(`/recetas/${recetaID}`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setReceta(data);
        } else if (!cancelado) {
          setError('No se pudo cargar la información de la receta.');
        }
      } catch {
        if (!cancelado) setError('Error al conectar con el servidor.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchReceta();
    return () => {
      cancelado = true;
    };
  }, [recetaID]);

  const etapas = receta?.detalles ?? receta?.version_actual?.detalles ?? [];
  const versionActual = receta?.version_actual;
  const esVigente = Boolean(receta?.version_vigente);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Detalle de Receta</h1>
        <div className="subtitulo">
          {receta
            ? `${receta.nombre} (ID #${receta.id})`
            : `Receta #${recetaID}`}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando receta...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : receta ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="receta-id">ID</label>
            <input id="receta-id" type="text" value={receta.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Receta</label>
            <input id="nombre" name="nombre" type="text" value={receta.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="rendimiento_final">Rendimiento Final</label>
            <input
              id="rendimiento_final"
              name="rendimiento_final"
              type="text"
              value={receta.rendimiento_final}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="version">Versión Actual</label>
            <input
              id="version"
              type="text"
              value={`v${versionActual?.version ?? 1} (${esVigente ? 'Vigente' : 'No vigente'})`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_creacion">Fecha de Creación</label>
            <input
              id="fecha_creacion"
              type="text"
              value={formatDate(receta.fecha_creacion)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_vigencia">Fecha de Vigencia</label>
            <input
              id="fecha_vigencia"
              type="text"
              value={formatDate(versionActual?.fecha_vigencia)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
            <input
              id="fecha_vencimiento"
              type="text"
              value={formatDate(versionActual?.fecha_vencimiento)}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Etapas de la Receta</label>
            {etapas.length === 0 ? (
              <input type="text" value="Sin etapas registradas" disabled />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {etapas.map((etapa: RecetaDetalleConId) => (
                  <div
                    key={etapa.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem 0.55rem 1rem',
                      backgroundColor: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.95rem',
                      color: 'var(--text-h)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                        minWidth: 0,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-texto)' }}>
                        {etapa.nombre} — {etapa.cantidad} {etapa.unidad_medida} (
                        {etapa.nombre_ingrediente ?? `Insumo #${etapa.ingrediente_id}`})
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-texto-sec)' }}>
                        {etapa.es_aditivo ? 'Aditivo · ' : 'Ingrediente · '}
                        Responsable: {etapa.nombre_operario ?? `Legajo #${etapa.operario_legajo}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ver"
                      title="Ver detalles"
                      onClick={() => {
                        setEtapaSeleccionada(etapa);
                        setModalVerEtapa(true);
                      }}
                    >
                      👁
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>La receta no existe.</div>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>

      <Dialog open={modalVerEtapa} onOpenChange={setModalVerEtapa}>
        <DialogContent>
          <VerDetalleReceta
            detalle={etapaSeleccionada}
            onCancel={() => setModalVerEtapa(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};