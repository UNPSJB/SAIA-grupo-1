import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/client';
import { ConfirmAlertDialog } from '../../../components/ui/alert-dialog';
import { Paginacion, usePaginacion } from '../../../components/ui/paginacion';
import { EtiquetaCategoria, type CategoriaIncidente } from '../tipos';
import { ModalCategoria } from './modalCategoria';
import '../../../styles/formularioAlta.css';
import '../../../styles/incidentes.css';

export interface ListadoCategoriasIncidentesProps {
  onVerAbiertos?: () => void;
  onVerHistorial?: () => void;
}

export const ListadoCategoriasIncidentes: React.FC<ListadoCategoriasIncidentesProps> = ({
  onVerAbiertos,
  onVerHistorial,
}) => {
  const [categorias, setCategorias] = useState<CategoriaIncidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaIncidente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaIncidente | null>(null);
  const [dialogEliminarAbierto, setDialogEliminarAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarCategorias = async () => {
    try {
      const res = await apiFetch('/incidentes/categorias/');
      if (res.ok) {
        const data: CategoriaIncidente[] = await res.json();
        setCategorias(data);
      } else {
        setCategorias([]);
      }
    } catch {
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const abrirCrear = () => {
    setCategoriaSeleccionada(null);
    setModalAbierto(true);
  };

  const abrirEditar = (cat: CategoriaIncidente) => {
    setCategoriaSeleccionada(cat);
    setModalAbierto(true);
  };

  const abrirEliminar = (cat: CategoriaIncidente) => {
    setErrorMsg(null);
    setCategoriaAEliminar(cat);
    setDialogEliminarAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!categoriaAEliminar) return;
    try {
      const res = await apiFetch(`/incidentes/categorias/${categoriaAEliminar.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCategorias((prev) => prev.filter((c) => c.id !== categoriaAEliminar.id));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'No se pudo eliminar la categoría.');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar la categoría.');
    } finally {
      setDialogEliminarAbierto(false);
      setCategoriaAEliminar(null);
    }
  };

  const categoriasFiltradas = categorias.filter((c) => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return (
      c.nombre.toLowerCase().includes(term) ||
      (c.descripcion && c.descripcion.toLowerCase().includes(term))
    );
  });

  const {
    itemsPaginados: categoriasPaginadas,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(categoriasFiltradas, 10);

  return (
    <div className="modulo-container modulo-incidentes-container">
      <div className="listado-top-bar" style={{ alignItems: 'flex-start' }}>
        <div className="modulo-header" style={{ marginBottom: 0 }}>
          <h1>Categorías de Incidentes</h1>
          <div className="subtitulo">
            04 · Gestión y tipificación de categorías para la clasificación de eventualidades
          </div>
        </div>

        <button type="button" onClick={abrirCrear} className="btn-guardar">
          + Nueva Categoría
        </button>
      </div>

      <div className="tabs-incidentes-header">
        {onVerAbiertos && (
          <button type="button" className="tab-incidente-btn" onClick={onVerAbiertos}>
            Abiertos
          </button>
        )}
        {onVerHistorial && (
          <button type="button" className="tab-incidente-btn" onClick={onVerHistorial}>
            Historial Completo
          </button>
        )}
        <button type="button" className="tab-incidente-btn activo">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Categorías
          <span className="badge-tab-contador">{categorias.length}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="alerta-error" style={{ marginTop: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="filtros-top-bar" style={{ marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar categoría por nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
          style={{ width: '100%', maxWidth: '380px' }}
        />
      </div>

      <div className="tabla-wrapper-incidentes" style={{ borderRadius: totalRegistros > 0 ? '12px 12px 0 0' : '12px' }}>
        <table className="tabla-custom-incidentes">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>ID</th>
              <th style={{ width: '28%' }}>Nombre</th>
              <th style={{ width: '38%' }}>Descripción</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Incidentes</th>
              <th className="acciones-col" style={{ width: '12%', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Cargando categorías...
                  </div>
                </td>
              </tr>
            ) : categoriasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text)' }}>
                  {busqueda
                    ? 'No se encontraron categorías que coincidan con la búsqueda.'
                    : 'No hay categorías registradas.'}
                </td>
              </tr>
            ) : (
              categoriasPaginadas.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-texto-sec)' }}>#{cat.id}</td>
                  <td>
                    <EtiquetaCategoria
                      nombre={cat.nombre}
                      id={cat.id}
                      size="md"
                    />
                  </td>
                  <td style={{ color: 'var(--color-texto-sec)', fontSize: '13px' }}>
                    {cat.descripcion || <span style={{ color: 'var(--color-borde)' }}>Sin descripción adicional</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className="badge-conteo"
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        backgroundColor: (cat.total_incidentes ?? 0) > 0 ? 'var(--color-suave)' : 'var(--color-fondo)',
                        color: (cat.total_incidentes ?? 0) > 0 ? 'var(--color-primario-texto)' : 'var(--color-texto-sec)',
                        border: '1px solid var(--color-borde)',
                      }}
                    >
                      {cat.total_incidentes ?? 0} {cat.total_incidentes === 1 ? 'incidente' : 'incidentes'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon btn-editar"
                        title="Editar categoría"
                        onClick={() => abrirEditar(cat)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-eliminar"
                        title={
                          (cat.total_incidentes ?? 0) > 0
                            ? 'No se puede eliminar: tiene incidentes asociados'
                            : 'Eliminar categoría'
                        }
                        disabled={(cat.total_incidentes ?? 0) > 0}
                        onClick={() => abrirEliminar(cat)}
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

      {totalRegistros > 0 && (
        <div style={{ border: '1px solid var(--color-borde)', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'var(--color-superficie)' }}>
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            filasPorPagina={filasPorPagina}
            totalRegistros={totalRegistros}
            indiceInicio={indiceInicio}
            indiceFin={indiceFin}
            onCambiarPagina={setPaginaActual}
            onCambiarFilasPorPagina={setFilasPorPagina}
            etiqueta="categorías"
          />
        </div>
      )}

      <ModalCategoria
        open={modalAbierto}
        categoria={categoriaSeleccionada}
        onClose={() => setModalAbierto(false)}
        onSuccess={cargarCategorias}
      />

      <ConfirmAlertDialog
        open={dialogEliminarAbierto}
        onCancel={() => setDialogEliminarAbierto(false)}
        title="Eliminar Categoría"
        description={`¿Está seguro de que desea eliminar la categoría "${categoriaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
      />
    </div>
  );
};

