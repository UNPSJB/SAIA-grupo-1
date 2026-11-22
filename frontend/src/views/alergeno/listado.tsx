import React, { useEffect, useState } from 'react';
import type { Alergeno } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { useAlertaOperacion } from '../../contexto/AlertaOperacionContext';

interface ListadoAlergenosProps {
  onNuevoClick?: () => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoAlergenos: React.FC<ListadoAlergenosProps> = ({
  onNuevoClick,
  onEditarClick,
}) => {
  const { mostrarExito, mostrarError } = useAlertaOperacion();
  const [alergenos, setAlergenos] = useState<Alergeno[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [alergenoAEliminar, setAlergenoAEliminar] = useState<Alergeno | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargarAlergenos = async () => {
      try {
        const res = await apiFetch('/alergenos/');
        if (!cancelado && res.ok) {
          const data = await res.json();
          setAlergenos(data);
        } else if (!cancelado) {
          setAlergenos([]);
        }
      } catch {
        if (!cancelado) setAlergenos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarAlergenos();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirConfirmacion = (alergeno: Alergeno) => {
    setErrorMsg(null);
    setAlergenoAEliminar(alergeno);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!alergenoAEliminar) return;
    try {
      const res = await apiFetch(`/alergenos/${alergenoAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlergenos((prev) => prev.filter((a) => a.id !== alergenoAEliminar.id));
        mostrarExito('Alérgeno eliminado', 'El alérgeno fue dado de baja correctamente.');
      } else {
        const err = await res.json().catch(() => ({}));
        const mensaje = typeof err.detail === 'string'
          ? err.detail
          : 'No se pudo eliminar el alérgeno.';
        setErrorMsg(mensaje);
        mostrarError('No se pudo eliminar el alérgeno', mensaje);
      }
    } catch {
      const mensaje = 'Error de conexión al eliminar el alérgeno.';
      setErrorMsg(mensaje);
      mostrarError('Error de conexión', mensaje);
    } finally {
      setDialogAbierto(false);
      setAlergenoAEliminar(null);
    }
  };

  const alergenosFiltrados = alergenos.filter((a) => {
    const term = busqueda.toLowerCase().trim();
    return !term || a.nombre.toLowerCase().includes(term);
  });

  const {
    itemsPaginados: alergenosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(alergenosFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Alérgenos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Nuevo Alérgeno
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar alérgeno por nombre..."
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
              <th style={{ width: '100px' }}>Símbolo</th>
              <th>Nombre del Alérgeno</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando alérgenos...
                </td>
              </tr>
            ) : alergenosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron alérgenos que coincidan con la búsqueda.'
                    : 'No hay alérgenos registrados.'}
                </td>
              </tr>
            ) : (
              alergenosPaginados.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>
                    {a.simbolo ? (
                      <img
                        src={a.simbolo}
                        alt={a.nombre}
                        style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.nombre}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-editar"
                        title="Editar alérgeno"
                        onClick={() => onEditarClick?.(a.id)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-eliminar"
                        title="Eliminar alérgeno"
                        onClick={() => abrirConfirmacion(a)}
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

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="alérgenos"
      />

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="Eliminar Alérgeno"
        description={`¿Está seguro de que desea eliminar el alérgeno "${alergenoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogAbierto(false);
          setAlergenoAEliminar(null);
        }}
      />
    </div>
  );
};