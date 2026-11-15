import React, { useEffect, useState } from 'react';
import type { RecetaConId, RecetaDetalleConId, VersionRecetaItem } from './tipos';
import '../../styles/formularioAlta.css';
import { VerDetalleReceta } from './VerEtapaReceta';
import { ModalHistorialVersionesReceta } from './ModalHistorialReceta';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
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
  const { esAdministrador } = useAuth();
  const [receta, setReceta] = useState<RecetaConId | null>(null);
  const [totalVersiones, setTotalVersiones] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVerEtapa, setModalVerEtapa] = useState(false);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<RecetaDetalleConId | null>(null);

  // Estado para abrir el Modal de Historial (igual que en Documentos)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [versionSeleccionada, setVersionSeleccionada] = useState<VersionRecetaItem | null>(null);

  useEffect(() => {
    if (!recetaID) return;
    let cancelado = false;
    const fetchReceta = async () => {
      try {
        const res = await apiFetch(`/recetas/${recetaID}`);
        if (!cancelado && res.ok) {
          const data: RecetaConId = await res.json();
          setReceta(data);
          // Mostrar siempre por defecto la versión vigente
          const vInicial = data.version_vigente ?? data.version_actual ?? null;
          setVersionSeleccionada(vInicial);
          if (vInicial?.version) {
            setTotalVersiones(vInicial.version);
          }
        } else if (!cancelado) {
          setError('No se pudo cargar la información de la receta.');
        }

        // Consultamos la cantidad total de versiones para mostrar en el botón
        const resVersiones = await apiFetch(`/recetas/${recetaID}/versiones`);
        if (!cancelado && resVersiones.ok) {
          const listaVersiones: VersionRecetaItem[] = await resVersiones.json();
          if (Array.isArray(listaVersiones) && listaVersiones.length > 0) {
            setTotalVersiones(listaVersiones.length);
          }
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

  const versionMostrada =
    versionSeleccionada ?? receta?.version_vigente ?? receta?.version_actual;
  const etapas = versionMostrada?.detalles ?? receta?.detalles ?? [];
  const versionVigente = receta?.version_vigente ?? receta?.version_actual;
  const viendoVersionAntigua =
    Boolean(versionMostrada && versionVigente && versionMostrada.id !== versionVigente.id);

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>
          {esAdministrador ? 'Detalle de Receta' : 'Consulta de Versión Vigente de Receta'}
        </h1>
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
          {viendoVersionAntigua && (
            <div
              className="alerta-error"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}
            >
              <span>
                Estás consultando una <strong>versión anterior (v{versionMostrada?.version})</strong> en modo solo lectura.
              </span>
              <button
                type="button"
                className="btn-guardar"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setVersionSeleccionada(versionVigente ?? null)}
              >
                Volver a la versión vigente (v{versionVigente?.version ?? 1})
              </button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="receta-id">ID</label>
            <input id="receta-id" type="text" value={receta.id} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Receta</label>
            <input id="nombre" name="nombre" type="text" value={receta.nombre} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="producto">Producto Asociado</label>
            <input
              id="producto"
              type="text"
              value={receta.nombre_producto ?? `Producto #${receta.id_producto}`}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="operario">Operario a Cargo</label>
            <input
              id="operario"
              type="text"
              value={
                receta.nombre_operario
                  ? `${receta.nombre_operario} (Legajo #${receta.operario_legajo})`
                  : `Legajo #${receta.operario_legajo}`
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="rendimiento_final">Rendimiento Final</label>
            <input
              id="rendimiento_final"
              name="rendimiento_final"
              type="text"
              value={versionMostrada?.rendimiento_final ?? receta.rendimiento_final}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="version">
              {viendoVersionAntigua ? 'Versión Consultada (Histórica)' : 'Versión Vigente'}
            </label>
            <input
              id="version"
              type="text"
              value={
                versionMostrada
                  ? `v${versionMostrada.version} (${
                      versionMostrada.es_vigente
                        ? `vigente desde ${formatDate(versionMostrada.fecha_vigencia || versionMostrada.creado_el)}`
                        : 'archivada · solo lectura'
                    })`
                  : 'Sin versiones registradas'
              }
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="receta-total-versiones">Historial de Versiones</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="receta-total-versiones"
                type="text"
                value=""
                disabled
                style={{ width: '100%', margin: 0 }}
              />
              <button
                type="button"
                onClick={() => setModalHistorialAbierto(true)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '12px',
                  transform: 'translateY(-50%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--color-primario-texto)',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                <span>Ver historial ({totalVersiones} versión/es)</span>
                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>↗</span>
              </button>
            </div>
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
              value={formatDate(versionMostrada?.fecha_vigencia)}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha_vencimiento">Fecha de Vencimiento</label>
            <input
              id="fecha_vencimiento"
              type="text"
              value={formatDate(versionMostrada?.fecha_vencimiento)}
              disabled
            />
          </div>

          <div className="form-group">
            <label>
              Etapas de la Receta (Versión v{versionMostrada?.version ?? 1})
            </label>
            {etapas.length === 0 ? (
              <input type="text" value="Sin etapas registradas en esta versión" disabled />
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
                        {etapa.es_aditivo ? 'Aditivo' : 'Ingrediente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-ver"
                      title="Ver detalles de la etapa"
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

      <ModalHistorialVersionesReceta
        isOpen={modalHistorialAbierto}
        onClose={() => setModalHistorialAbierto(false)}
        recetaId={receta?.id ?? null}
        recetaNombre={receta?.nombre}
        versionSeleccionadaId={versionMostrada?.id ?? null}
        onVerVersion={(versionElegida) => setVersionSeleccionada(versionElegida)}
      />
    </div>
  );
};