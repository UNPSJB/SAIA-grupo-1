import {useState, useEffect} from 'react';
import '../../styles/formularioAlta.css';
import type { PlanDeCalibracionConId } from './tipos';


interface ListadoPlanesCProps {
    onNuevoClick?: () => void;
    onDetalleClick?: (id: number) => void;
    onEditarClick?: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
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


export const ListadoPlanesCalibracion: React.FC<ListadoPlanesCProps> = ({ onNuevoClick, onDetalleClick, onEditarClick }) => {
    const [planes, setPlanes] = useState<PlanDeCalibracionConId[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        let ignore = false;
        async function load() {
          try {
            const res = await fetch(`${API_URL}/plan_de_calibracion/`);
            if (res.ok) {
              const data = await res.json();
              if (!ignore) setPlanes(data);
            } else {
              if (!ignore) setPlanes([]);
            }
          } catch {
            if (!ignore) setPlanes([]);
          } finally {
            if (!ignore) setLoading(false);
          }
        }
        load();
        return () => {
          ignore = true;
        };
      }, []);

  type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia' | 'sin_fecha';

  const calcularEstadoVencimiento = (fechavencimientoStr?: string | null): EstadoVencimiento => {
    if (!fechavencimientoStr) return 'sin_fecha';

    const fechaLimite = new Date(fechavencimientoStr);
    const hoy = new Date();

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
      return 'vencido';
    } else if (diffDias <= 2) {
      return 'proximo';
    }

    return 'al_dia';
  };

    const planesCFiltrados = planes.filter((p) => {
    
        const term = busqueda.toLowerCase().trim();
        const coincideBusqueda = !term || 
        (p.nombre?.toLowerCase().includes(term) ?? false) || (p.nombre_equipo?.toLowerCase().includes(term) ?? false);
        const coincideVencimiento = !term || (p.fecha_vencimiento?.toLowerCase().includes(term) ?? false);
        return coincideBusqueda || coincideVencimiento;
    });


return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Planes de Limpieza</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Crear Plan
          </button>
        )}
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por plan o equipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Equipo</th>
              <th>Fecha de Mantenimiento</th>
              <th>Fecha de Vencimiento</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Planes...
                </td>
              </tr>
            ) : planesCFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron planes de limpieza que coincidan con los filtros.'
                    : 'No hay planes registrados.'}
                </td>
              </tr>
            ) : (
              planesCFiltrados.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td>{p.nombre_equipo}</td>
                  <td>{formatDate(p.fecha_mantenimiento)}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{formatDate(p.fecha_vencimiento)}</span>

                      {/* VENCIDO */}
                      {calcularEstadoVencimiento(p.fecha_vencimiento) === 'vencido' && (
                        <span
                          title="El elemento ha superado la fecha límite"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #f87171',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ● Vencido
                        </span>
                      )}

                      {/* PRÓXIMO A VENCER */}
                      {calcularEstadoVencimiento(p.fecha_vencimiento) === 'proximo' && (
                        <span
                          title="Quedan 2 días o menos para el recambio"
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fcd34d',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ▲ Próximo a vencer
                        </span>
                      )}
                    </div></td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick?.(p.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(p.id)}
                      >
                        ✎
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
