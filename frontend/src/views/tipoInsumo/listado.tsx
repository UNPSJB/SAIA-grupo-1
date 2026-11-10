import React, { useEffect, useState } from 'react';
import type { TipoInsumo } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
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
  const [soloActivos, setSoloActivos] = useState(true);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoInsumo | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!soloActivos) params.append('solo_activos', 'false');
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/insumos/tipos/${query}`);
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
  }, [soloActivos, busqueda]);

  const abrirConfirmacion = (tipo: TipoInsumo) => {
    setErrorMsg(null);
    setTipoAEliminar(tipo);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!tipoAEliminar) return;
    try {
      const res = await apiFetch(`/insumos/tipos/${tipoAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTipos((prev) =>
          soloActivos
            ? prev.filter((t) => t.id !== tipoAEliminar.id)
            : prev.map((t) => (t.id === tipoAEliminar.id ? { ...t, activo: false } : t))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'No se pudo eliminar el tipo de insumo.');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar el tipo de insumo.');
    } finally {
      setDialogAbierto(false);
      setTipoAEliminar(null);
    }
  };

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      if (!soloActivos) params.append('solo_activos', 'false');

      const queryString = params.toString();
      const url = `/insumos/tipos/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'tipos_insumos.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al exportar tipos de insumos a CSV.');
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
  } = usePaginacion(tipos);

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

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <div className="filtros-top-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar tipo de insumo por nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
          />
          Solo activos
        </label>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Nombre Genérico</th>
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
            ) : tipos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron tipos de insumo que coincidan con la búsqueda.'
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
                  <td>{t.cantidad_lotes ?? 0}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: t.activo ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.activo ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      {onVerDetalleClick && (
                        <button
                          className="btn-icon btn-editar"
                          title="Ver detalle e historial de lotes"
                          onClick={() => onVerDetalleClick(t.id)}
                        >
                          👁
                        </button>
                      )}
                      <button
                        className="btn-icon btn-editar"
                        title="Editar tipo de insumo"
                        onClick={() => onEditarClick?.(t.id)}
                      >
                        ✎
                      </button>
                      {t.activo && (
                        <button
                          className="btn-icon btn-eliminar"
                          title="Dar de baja tipo de insumo"
                          onClick={() => abrirConfirmacion(t)}
                        >
                          🗑
                        </button>
                      )}
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
        />
      )}

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="Dar de baja tipo de insumo"
        description={`¿Estás seguro de que deseas dar de baja el tipo de insumo "${tipoAEliminar?.nombre}"? Nota: No se puede eliminar si ya tiene insumos o lotes asociados.`}
        confirmText="Dar de baja"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => setDialogAbierto(false)}
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
