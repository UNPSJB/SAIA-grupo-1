import React, { useEffect, useState } from 'react';
import type { UnidadMedidaItem } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoUnidadesMedidaProps {
  onNuevoClick?: () => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoUnidadesMedida: React.FC<ListadoUnidadesMedidaProps> = ({
  onNuevoClick,
  onEditarClick,
}) => {
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const [unidadAConfirmar, setUnidadAConfirmar] = useState<UnidadMedidaItem | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const cargarUnidades = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/unidades-medida/?solo_activos=false');
      if (res.ok) {
        const data = await res.json();
        setUnidades(data);
      } else {
        setUnidades([]);
      }
    } catch {
      setUnidades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    const init = async () => {
      try {
        const res = await apiFetch('/unidades-medida/?solo_activos=false');
        if (!cancelado && res.ok) {
          const data = await res.json();
          setUnidades(data);
        } else if (!cancelado) {
          setUnidades([]);
        }
      } catch {
        if (!cancelado) setUnidades([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    init();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirConfirmacion = (unidad: UnidadMedidaItem) => {
    setErrorDialogMsg(null);
    setUnidadAConfirmar(unidad);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!unidadAConfirmar) return;
    try {
      const esBaja = unidadAConfirmar.activo;
      const endpoint = esBaja
        ? `/unidades-medida/${unidadAConfirmar.id}`
        : `/unidades-medida/${unidadAConfirmar.id}/restaurar`;
      const method = esBaja ? 'DELETE' : 'POST';

      const res = await apiFetch(endpoint, { method });
      if (res.ok) {
        await cargarUnidades();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(
          err.detail ||
            (esBaja
              ? 'No se pudo dar de baja la unidad de medida.'
              : 'No se pudo restaurar la unidad de medida.')
        );
      }
    } catch {
      setErrorDialogMsg('Error de conexión con el servidor.');
    } finally {
      setDialogAbierto(false);
      setUnidadAConfirmar(null);
    }
  };

  const unidadesFiltradas = unidades.filter((u) => {
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      u.nombre.toLowerCase().includes(term) ||
      u.abreviatura.toLowerCase().includes(term);

    const matchEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activo' && u.activo) ||
      (filtroEstado === 'inactivo' && !u.activo);

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
      const url = `/unidades-medida/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'unidades_medida.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(
        err instanceof Error ? err.message : 'Error al exportar unidades de medida a CSV.'
      );
    } finally {
      setExportando(false);
    }
  };

  const {
    itemsPaginados: unidadesPaginadas,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(unidadesFiltradas);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Unidades de Medida</h1>
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
              + Nueva Unidad
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar por nombre o abreviatura..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}
          className="select-filtro"
        >
          <option value="todos">Estado: Todos</option>
          <option value="activo">Solo Activos</option>
          <option value="inactivo">Solo Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>ID</th>
              <th>Nombre</th>
              <th style={{ width: '140px' }}>Abreviatura</th>
              <th style={{ width: '160px' }}>Registros Asociados</th>
              <th style={{ width: '120px' }}>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando unidades de medida...
                </td>
              </tr>
            ) : unidadesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroEstado !== 'todos'
                    ? 'No se encontraron unidades de medida que coincidan con los filtros.'
                    : 'No hay unidades de medida registradas.'}
                </td>
              </tr>
            ) : (
              unidadesPaginadas.map((u) => (
                <tr key={u.id} style={!u.activo ? { opacity: 0.65 } : undefined}>
                  <td>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td>
                    <span className="shadcn-badge shadcn-badge-secondary">{u.abreviatura}</span>
                  </td>
                  <td>{u.total_referencias}</td>
                  <td>
                    <span className={`badge-status ${u.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      {onEditarClick && (
                        <button
                          className="btn-icon btn-editar"
                          title="Editar unidad de medida"
                          onClick={() => onEditarClick(u.id)}
                        >
                          ✎
                        </button>
                      )}
                      {u.activo ? (
                        <button
                          className="btn-icon btn-eliminar"
                          title="Dar de baja unidad de medida"
                          onClick={() => abrirConfirmacion(u)}
                        >
                          🗑
                        </button>
                      ) : (
                        <button
                          className="btn-icon btn-reactivar"
                          title="Restaurar unidad de medida"
                          onClick={() => abrirConfirmacion(u)}
                        >
                          🔄
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
          indiceInicio={indiceInicio}
          indiceFin={indiceFin}
          filasPorPagina={filasPorPagina}
          onCambiarPagina={setPaginaActual}
          onCambiarFilasPorPagina={setFilasPorPagina}
          etiqueta="unidades de medida"
        />
      )}

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={unidadesFiltradas.length}
        filtrosAplicados={
          busqueda.trim() || filtroEstado !== 'todos'
            ? `${busqueda.trim() ? `Búsqueda: "${busqueda}"` : ''} ${
                filtroEstado !== 'todos' ? `Estado: ${filtroEstado}` : ''
              }`.trim()
            : 'Todos los registros'
        }
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={
          unidadAConfirmar?.activo
            ? '¿Dar de baja unidad de medida?'
            : '¿Restaurar unidad de medida?'
        }
        description={
          unidadAConfirmar?.activo
            ? `¿Estás seguro de que deseas dar de baja la unidad "${unidadAConfirmar?.nombre}" (${unidadAConfirmar?.abreviatura})?`
            : `¿Estás seguro de que deseas restaurar la unidad "${unidadAConfirmar?.nombre}" (${unidadAConfirmar?.abreviatura})?`
        }
        confirmText={unidadAConfirmar?.activo ? 'Confirmar Baja' : 'Confirmar Restauración'}
        cancelText="Cancelar"
        isDestructive={Boolean(unidadAConfirmar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setUnidadAConfirmar(null);
        }}
      />

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ''}
        onClose={() => setErrorDialogMsg(null)}
      />
    </div>
  );
};
