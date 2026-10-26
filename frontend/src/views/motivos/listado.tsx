import React, { useEffect, useState } from 'react';
import type { MotivoNoRealizado } from './tipos';
import '../../styles/formularioAlta.css';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import { apiFetch } from '../../api/client';

interface ListadoMotivosProps {
  onNuevoClick?: () => void;
}

export const ListadoMotivos: React.FC<ListadoMotivosProps> = ({ onNuevoClick }) => {
  const [motivos, setMotivos] = useState<MotivoNoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarMotivos = async () => {
    try {
      const res = await apiFetch('/checklist/motivos/');
      if (res.ok) {
        const data = await res.json();
        setMotivos(data);
      } else {
        setMotivos([]);
      }
    } catch {
      setMotivos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMotivos();
  }, []);

  const handleToggleActivo = async (motivo: MotivoNoRealizado) => {
    setErrorMsg(null);
    setTogglingId(motivo.id);
    try {
      const nuevoEstado = !motivo.activo;
      const res = await apiFetch(`/checklist/motivos/${motivo.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      if (res.ok) {
        const data = await res.json();
        setMotivos((prev) =>
          prev.map((m) => (m.id === motivo.id ? { ...m, activo: data.activo } : m))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'Error al cambiar el estado del motivo.');
      }
    } catch {
      setErrorMsg('Error de conexión al actualizar el motivo.');
    } finally {
      setTogglingId(null);
    }
  };

  const motivosFiltrados = motivos.filter((m) => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return m.nombre.toLowerCase().includes(term);
  });

  const {
    itemsPaginados: motivosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion<MotivoNoRealizado>(motivosFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Motivos de No Realización</h1>
          <div className="subtitulo">01 · Catálogo y Gestión</div>
        </div>
        {onNuevoClick && (
          <div className="top-bar-acciones">
            <button type="button" className="btn-guardar" onClick={onNuevoClick}>
              + Nuevo Motivo
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="alerta-error" style={{ marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="filtros-historial">
        <div className="filtro-campo-grupo" style={{ flex: 1 }}>
          <label htmlFor="busqueda-motivos">Buscar motivo:</label>
          <input
            id="busqueda-motivos"
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="tabla-contenedor">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando motivos...</p>
        ) : motivosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            {busqueda ? 'No se encontraron motivos que coincidan con la búsqueda.' : 'No hay motivos registrados.'}
          </p>
        ) : (
          <table className="tabla-listado">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre</th>
                <th style={{ width: '140px' }}>Estado</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {motivosPaginados.map((motivo) => (
                <tr key={motivo.id}>
                  <td><strong>#{motivo.id}</strong></td>
                  <td><strong>{motivo.nombre}</strong></td>
                  <td>
                    <span className={`badge-registro ${motivo.activo ? 'activo' : 'inactivo'}`}>
                      {motivo.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className={motivo.activo ? 'btn-icon btn-eliminar' : 'btn-icon btn-ver'}
                        style={{ width: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}
                        title={motivo.activo ? 'Desactivar motivo' : 'Activar motivo'}
                        onClick={() => handleToggleActivo(motivo)}
                        disabled={togglingId === motivo.id}
                      >
                        {motivo.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="motivos"
      />
    </div>
  );
};
