import React, { useEffect, useState } from 'react';
import type { Sector } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import { apiFetch } from '../../api/client';

interface ListadoSectoresProps {
  onNuevoClick?: () => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoSectores: React.FC<ListadoSectoresProps> = ({
  onNuevoClick,
  onEditarClick,
}) => {
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sectorAEliminar, setSectorAEliminar] = useState<Sector | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarSectores = async () => {
    try {
      const res = await apiFetch('/sectores/');
      if (res.ok) {
        const data = await res.json();
        setSectores(data);
      } else {
        setSectores([]);
      }
    } catch {
      setSectores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSectores();
  }, []);

  const abrirConfirmacion = (sector: Sector) => {
    setErrorMsg(null);
    setSectorAEliminar(sector);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!sectorAEliminar) return;
    try {
      const res = await apiFetch(`/sectores/${sectorAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSectores((prev) => prev.filter((s) => s.id !== sectorAEliminar.id));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'No se pudo eliminar el sector.');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar el sector.');
    } finally {
      setDialogAbierto(false);
      setSectorAEliminar(null);
    }
  };

  const sectoresFiltrados = sectores.filter((s) => {
    const term = busqueda.toLowerCase().trim();
    return !term || s.nombre.toLowerCase().includes(term);
  });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Sectores</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Nuevo Sector
          </button>
        )}
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar sector por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Nombre del Sector</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando sectores...
                </td>
              </tr>
            ) : sectoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron sectores que coincidan con la búsqueda.'
                    : 'No hay sectores registrados.'}
                </td>
              </tr>
            ) : (
              sectoresFiltrados.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td style={{ fontWeight: 500 }}>{s.nombre}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-editar"
                        title="Editar sector"
                        onClick={() => onEditarClick?.(s.id)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-eliminar"
                        title="Eliminar sector"
                        onClick={() => abrirConfirmacion(s)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="Eliminar Sector"
        description={`¿Está seguro de que desea eliminar el sector "${sectorAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogAbierto(false);
          setSectorAEliminar(null);
        }}
      />
    </div>
  );
};

