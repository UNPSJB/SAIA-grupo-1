import { useState, useEffect } from 'react';
import '../../styles/formularioAlta.css';
import type { PlanDeCalibracionConId } from '../planDeCalibracion/tipos';
import { VerCalibracion } from './verCalibracionEcha';
import { apiFetch } from '../../api/client';
import { Dialog, DialogContent } from '../../components/ui/dialog';

interface ListadoCalibracionesProps {
  planID?: number | null;
  onCancel?: () => void;
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

export const ListadoCalibracionesRealizadas: React.FC<ListadoCalibracionesProps> = ({
  onCancel,
  planID,
}) => {
  const [planCalibracion, setPlanCalibracion] = useState<PlanDeCalibracionConId | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalVer, setModalVer] = useState(false);
  const [calibracionSeleccionada, setCalibracionSeleccionada] = useState<number | null>(null);

  const obtenerTipoArchivo = (ruta?: string | null) => {
    if (!ruta) return 'No adjunto';
    const extension = ruta.split('.').pop();
    return extension ? `Archivo ${extension.toUpperCase()}` : 'Desconocido';
  };

  useEffect(() => {
    if (planID) {
      const fetchPlanCalibracion = async () => {
        try {
          const res = await apiFetch(`/plan_de_calibracion/${planID}/`);
          if (res.ok) {
            const data = await res.json();
            setPlanCalibracion(data);
          }
        } catch {
          setPlanCalibracion(null);
        } finally {
          setLoading(false);
        }
      };

      fetchPlanCalibracion();
    }
  }, [planID]);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Ejecuciones</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por fecha o archivo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Fecha de Realización</th>
              <th>Formato del Archivo</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando ejecuciones...
                </td>
              </tr>
            ) : planCalibracion?.calibraciones_realizadas?.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron calibraciones que coincidan con los filtros.'
                    : 'No hay registros de calibraciones realizadas.'}
                </td>
              </tr>
            ) : (
              planCalibracion?.calibraciones_realizadas?.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{formatDate(c.fecha_d_realizacion)}</td>
                  <td>
                    <span className="badge-archivo" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      📄 {obtenerTipoArchivo(c.formato_archivo)}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => {
                          setCalibracionSeleccionada(c.id);
                          setModalVer(true);
                        }}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-editar"
                        title="Descargar Certificado"
                        onClick={() => {
                          setCalibracionSeleccionada(c.id);
                          setModalVer(true);
                        }}
                      >
                        📥
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onCancel}>
          Volver
        </button>
      </div>

      <Dialog open={modalVer} onOpenChange={setModalVer}>
        <DialogContent>
          <VerCalibracion
            calibracionID={calibracionSeleccionada}
            onCancel={() => setModalVer(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

