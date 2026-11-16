import React, { useEffect, useState } from 'react';
import type { MotivoNoRealizado } from './tipos';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import { ConfirmExportDialog, type FormatoExportacion } from '../../components/ui/confirmExportDialog';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { descargarCSV } from '../../utils/exportarCsv';
import { descargarPDF } from '../../utils/exportarPdf';

interface ListadoMotivosProps {
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
}

type CriterioOrden = 'id' | 'nombre';

export const ListadoMotivos: React.FC<ListadoMotivosProps> = ({
  onNuevoClick,
  onDetalleClick,
}) => {
  const [motivos, setMotivos] = useState<MotivoNoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<CriterioOrden>('id');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivoAAlterar, setMotivoAAlterar] = useState<MotivoNoRealizado | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const fetchMotivos = async () => {
      try {
        const res = await apiFetch(`/checklist/motivos/`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setMotivos(data);
        } else if (!cancelado) {
          setMotivos([]);
        }
      } catch {
        if (!cancelado) setMotivos([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchMotivos();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirConfirmacionToggle = (motivo: MotivoNoRealizado) => {
    setErrorMsg(null);
    setMotivoAAlterar(motivo);
    setDialogOpen(true);
  };

  const ejecutarToggle = async () => {
    if (!motivoAAlterar) return;
    const { id, activo } = motivoAAlterar;
    setDialogOpen(false);
    setMotivoAAlterar(null);
    setTogglingId(id);

    try {
      const nuevoEstado = !activo;
      const res = await apiFetch(`/checklist/motivos/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });

      if (res.ok) {
        const data = await res.json();
        setMotivos((prev) =>
          prev.map((m) => (m.id === id ? { ...m, activo: data.activo } : m))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        let detalle = 'No se pudo actualizar el estado del motivo.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        }
        setErrorMsg(detalle);
      }
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setTogglingId(null);
    }
  };

  const motivosFiltradosYOrdenados = motivos
    .filter((m) => {
      const term = searchTerm.toLowerCase().trim();
      const coincideNombre = !term || m.nombre.toLowerCase().includes(term);
      if (!coincideNombre) return false;
      if (filtroEstado === 'activos') return m.activo;
      if (filtroEstado === 'inactivos') return !m.activo;
      return true;
    })
    .sort((a, b) => {
      if (ordenarPor === 'nombre') {
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }
      return a.id - b.id;
    });

    const ejecutarExportacion = async (formato: FormatoExportacion) => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (searchTerm.trim()) params.append('busqueda', searchTerm.trim());
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
      if (ordenarPor !== 'id') params.append('ordenar_por', ordenarPor);

      const queryString = params.toString();
      const query = queryString ? `?${queryString}` : '';

      if (formato === 'pdf') {
        await descargarPDF(`/checklist/motivos/exportar-pdf${query}`, 'motivos_no_realizacion.pdf');
      } else {
        await descargarCSV(`/checklist/motivos/exportar-csv${query}`, 'motivos_no_realizacion.csv');
      }

      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : `Error al exportar motivos de no realización a ${formato.toUpperCase()}.`
      );
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (searchTerm.trim()) partes.push(`Búsqueda: "${searchTerm}"`);
    if (filtroEstado !== 'todos') {
      partes.push(`Estado: ${filtroEstado === 'activos' ? 'Solo activos' : 'Solo inactivos'}`);
    }
    if (ordenarPor === 'nombre') partes.push('Ordenado por: Nombre');
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

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
  } = usePaginacion(motivosFiltradosYOrdenados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Motivos de No Realización</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ExportIcon size={18} /> Exportar
          </button>

          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Agregar Motivo
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

        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>ID</th>
              <th>Nombre</th>
              <th style={{ width: '140px' }}>Estado</th>
              <th className="acciones-col" style={{ width: '160px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando motivos de no realización...
                </td>
              </tr>
            ) : motivosFiltradosYOrdenados.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron motivos de no realización.
                </td>
              </tr>
            ) : (
              motivosPaginados.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>
                    <strong>{item.nombre}</strong>
                  </td>
                  <td>
                    <span className={`badge-registro ${item.activo ? 'activo' : 'inactivo'}`}>
                      {item.activo ? '● Activo' : '○ Inactivo'}
                    </span>
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
                        className={`btn-icon ${item.activo ? 'btn-eliminar' : 'btn-reactivar'}`}
                        title={item.activo ? 'Desactivar motivo' : 'Reactivar motivo'}
                        onClick={() => abrirConfirmacionToggle(item)}
                        disabled={togglingId === item.id}
                      >
                        {item.activo ? '🗑' : '🔄'}
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
        etiqueta="motivos"
      />

      <ConfirmAlertDialog
        open={dialogOpen}
        title={motivoAAlterar?.activo ? '¿Desactivar Motivo?' : '¿Activar Motivo?'}
        description={
          motivoAAlterar?.activo
            ? `¿Estás seguro de que deseas desactivar el motivo "${motivoAAlterar?.nombre}"? Dejará de aparecer como opción en las tareas de checklist.`
            : `¿Estás seguro de que deseas activar el motivo "${motivoAAlterar?.nombre}"? Volverá a estar disponible para su selección.`
        }
        confirmText={motivoAAlterar?.activo ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        isDestructive={Boolean(motivoAAlterar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogOpen(false);
          setMotivoAAlterar(null);
        }}
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={motivosFiltradosYOrdenados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};
