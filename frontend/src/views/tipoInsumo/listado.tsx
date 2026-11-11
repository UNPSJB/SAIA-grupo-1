import React, { useEffect, useState } from 'react';
import type { TipoInsumo } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoTiposInsumosProps {
  onNuevoClick?: () => void;
  onEditarClick?: (id: number) => void;
  onVerDetalleClick?: (id: number) => void;
}

export const ListadoTiposInsumos: React.FC<ListadoTiposInsumosProps> = ({
  onNuevoClick,
  onEditarClick,
  onVerDetalleClick,
}) => {
  const [tipos, setTipos] = useState<TipoInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [tipoAConfirmar, setTipoAConfirmar] = useState<TipoInsumo | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/insumos/tipos/?solo_activos=false');
      if (res.ok) {
        const data = await res.json();
        setTipos(data);
      } else {
        setTipos([]);
      }
    } catch {
      setTipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTipos();
  }, []);

  const abrirConfirmacion = (tipo: TipoInsumo) => {
    setTipoAConfirmar(tipo);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!tipoAConfirmar) return;
    const esActivo = tipoAConfirmar.activo;
    const accion = esActivo ? 'dar de baja' : 'restaurar';
    try {
      const url = esActivo
        ? `/insumos/tipos/${tipoAConfirmar.id}`
        : `/insumos/tipos/${tipoAConfirmar.id}/restaurar`;
      const method = esActivo ? 'DELETE' : 'POST';
      const res = await apiFetch(url, { method });

      if (res.ok) {
        setTipos((prev) =>
          prev.map((t) =>
            t.id === tipoAConfirmar.id ? { ...t, activo: !esActivo } : t
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || `No se pudo ${accion} el tipo de insumo.`);
      }
    } catch {
      setErrorDialogMsg(`Error de conexión al ${accion} el tipo de insumo.`);
    } finally {
      setDialogAbierto(false);
      setTipoAConfirmar(null);
    }
  };

  const tiposFiltrados = tipos.filter((t) => {
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      t.nombre.toLowerCase().includes(term) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(term));

    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'activo' && t.activo) ||
      (filtroEstado === 'inactivo' && !t.activo);

    return matchBusqueda && matchEstado;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      if (filtroEstado === 'activo') {
        params.append('solo_activos', 'true');
      }

      const queryString = params.toString();
      const url = `/insumos/tipos/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'tipos_insumos.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(err instanceof Error ? err.message : 'Error al exportar tipos de insumos a CSV.');
    } finally {
      setExportando(false);
    }
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
  } = usePaginacion(tiposFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Tipos de Insumo</h1>
          <div className="subtitulo">01 · Categorización Genérica de Ingredientes</div>
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
              + Nuevo Tipo de Insumo
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar tipo de insumo por nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Nombre</th>
              <th>Unidad de Medida</th>
              <th>Descripción</th>
              <th>Lotes Registrados</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando tipos de insumo...
                </td>
              </tr>
            ) : tiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroEstado !== 'TODOS'
                    ? 'No se encontraron tipos de insumo que coincidan con los filtros.'
                    : 'No hay tipos de insumo registrados.'}
                </td>
              </tr>
            ) : (
              tiposPaginados.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                  <td style={{ textTransform: 'capitalize' }}>{t.unidadMedida}</td>
                  <td>{t.descripcion || '-'}</td>
                  <td>{t.cantidad_lotes ?? t.total_lotes ?? 0}</td>
                  <td>
                    <span className={`badge-status ${t.activo ? 'activo' : 'inactivo'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalle"
                        onClick={() => onVerDetalleClick?.(t.id)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(t.id)}
                      >
                        ✎
                      </button>
                      <button
                        className={`btn-icon ${t.activo ? 'btn-eliminar' : 'btn-reactivar'}`}
                        title={t.activo ? 'Dar de baja' : 'Restaurar'}
                        onClick={() => abrirConfirmacion(t)}
                      >
                        {t.activo ? '🗑' : '🔄'}
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
        <Paginacion
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalRegistros={totalRegistros}
          filasPorPagina={filasPorPagina}
          indiceInicio={indiceInicio}
          indiceFin={indiceFin}
          onCambiarPagina={setPaginaActual}
          onCambiarFilasPorPagina={setFilasPorPagina}
          etiqueta="tipos de insumo"
        />
      )}

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={tipoAConfirmar?.activo ? '¿Dar de baja tipo de insumo?' : '¿Restaurar tipo de insumo?'}
        description={
          tipoAConfirmar?.activo
            ? `¿Estás seguro de que deseas dar de baja el tipo de insumo "${tipoAConfirmar?.nombre}"?`
            : `¿Estás seguro de que deseas restaurar el tipo de insumo "${tipoAConfirmar?.nombre}"?`
        }
        confirmText={tipoAConfirmar?.activo ? 'Confirmar Baja' : 'Confirmar Restauración'}
        cancelText="Cancelar"
        isDestructive={Boolean(tipoAConfirmar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setTipoAConfirmar(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ''}
        onClose={() => setErrorDialogMsg(null)}
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={totalRegistros}
        filtrosAplicados={busqueda.trim() ? `Búsqueda: "${busqueda}"` : undefined}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};
