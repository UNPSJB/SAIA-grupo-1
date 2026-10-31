import React, { useEffect, useState } from 'react';
import type { TipoDocumento } from './tipos';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoTiposDocumentosProps {
  onNuevoClick?: () => void;
  onDetalleClick: (id: number) => void;
}

type CriterioOrden = 'id' | 'nombre';

export const ListadoTiposDocumentos: React.FC<ListadoTiposDocumentosProps> = ({
  onNuevoClick,
  onDetalleClick,
}) => {
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<CriterioOrden>('id');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoDocumento | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchTipos = async () => {
      try {
        const res = await apiFetch(`/documentos/tipos/`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setTipos(data);
        } else if (!cancelado) {
          setTipos([]);
        }
      } catch {
        if (!cancelado) setTipos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchTipos();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirConfirmacionEliminar = (tipo: TipoDocumento) => {
    setErrorMsg(null);
    setTipoAEliminar(tipo);
    setDialogOpen(true);
  };

  const ejecutarEliminar = async () => {
    if (!tipoAEliminar) return;
    const { id } = tipoAEliminar;
    setDialogOpen(false);
    setTipoAEliminar(null);

    try {
      const res = await apiFetch(`/documentos/tipos/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTipos((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        let detalle = 'No se pudo eliminar el tipo de documento.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        }
        setErrorMsg(detalle);
      }
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    }
  };

  const tiposFiltradosYOrdenados = tipos
    .filter((t) => {
      const term = searchTerm.toLowerCase().trim();
      return !term || t.nombre.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (ordenarPor === 'nombre') {
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }
      return a.id - b.id;
    });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append('busqueda', searchTerm.trim());
      }

      const queryString = params.toString();
      const url = `/documentos/tipos/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'tipos_documentos.csv');
      setDialogExportarAbierto(false);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Error al exportar los tipos de documentos a CSV.'
      );
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    if (searchTerm.trim()) {
      return `Búsqueda: "${searchTerm}"`;
    }
    return 'Sin filtros aplicados';
  };

  const {
    itemsPaginados: tiposPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(tiposFiltradosYOrdenados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Tipos de Documentos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CsvIcon /> Exportar CSV
          </button>

          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Agregar Tipo
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="alerta-error" style={{ marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="select-filtro"
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as CriterioOrden)}
        >
          <option value="id">Ordenar por ID</option>
          <option value="nombre">Ordenar por Nombre</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>ID</th>
              <th>Nombre</th>
              <th className="acciones-col" style={{ width: '140px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando tipos de documentos...
                </td>
              </tr>
            ) : tiposFiltradosYOrdenados.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron tipos de documentos.
                </td>
              </tr>
            ) : (
              tiposPaginados.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>
                    <strong>{item.nombre}</strong>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick(item.id)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-eliminar"
                        title="Eliminar tipo"
                        onClick={() => abrirConfirmacionEliminar(item)}
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
        etiqueta="tipos de documento"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={tiposFiltradosYOrdenados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogOpen}
        title="¿Eliminar Tipo de Documento?"
        description={`¿Estás seguro de que deseas eliminar permanentemente el tipo "${tipoAEliminar?.nombre}"? Solo podrá eliminarse si no está asignado a ningún documento.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogOpen(false);
          setTipoAEliminar(null);
        }}
      />
    </div>
  );
};