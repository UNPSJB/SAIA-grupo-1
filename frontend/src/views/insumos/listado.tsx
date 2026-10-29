import React, { useEffect, useState } from 'react';
import type { InsumoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoInsumosProps {
  onNuevoClick?: () => void;
  onVerClick?: (insumo: InsumoConId) => void;
  onEditarClick?: (insumo: InsumoConId) => void;
}

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

const estadoVencimiento = (fechaVencimiento?: string | null) => {
  if (!fechaVencimiento) return 'SIN_VENCIMIENTO';
  const fecha = new Date(fechaVencimiento);
  const hoy = new Date();
  const diffMs = fecha.getTime() - hoy.getTime();
  const dias = diffMs / (1000 * 60 * 60 * 24);
  if (dias < 0) return 'VENCIDO';
  if (dias <= 15) return 'POR_VENCER';
  return 'VIGENTE';
};

export const ListadoInsumos: React.FC<ListadoInsumosProps> = ({
  onNuevoClick,
  onVerClick,
  onEditarClick,
}) => {
  const [insumos, setInsumos] = useState<InsumoConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('TODOS');
  const [filtroVencimiento, setFiltroVencimiento] = useState('TODOS');

  const [idAEliminar, setIdAEliminar] = useState<number | null>(null);
  const [nombreAEliminar, setNombreAEliminar] = useState<string>('');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const abrirConfirmacion = (i: InsumoConId) => {
    setIdAEliminar(i.id);
    setNombreAEliminar(i.nombre);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!idAEliminar) return;
    try {
      const res = await apiFetch(`/insumos/${idAEliminar}`, { method: 'DELETE' });
      if (res.ok) {
        setInsumos((prev) => prev.filter((i) => i.id !== idAEliminar));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || 'No se pudo eliminar el ingrediente.');
      }
    } catch {
      setErrorDialogMsg('Error de conexión al eliminar el ingrediente.');
    } finally {
      setDialogAbierto(false);
      setIdAEliminar(null);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch(`/insumos/`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setInsumos(data);
        } else {
          if (!ignore) setInsumos([]);
        }
      } catch {
        if (!ignore) setInsumos([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);



  const insumosFiltrados = insumos.filter((i) => {
    const term = busqueda.toLowerCase().trim();
    const coincideBusqueda =
      !term ||
      (i.nombre?.toLowerCase().includes(term) ?? false) ||
      (i.lote?.toLowerCase().includes(term) ?? false);
    const coincideUnidad = filtroUnidad === 'TODOS' || i.medida?.toUpperCase() === filtroUnidad;
    const coincideVencimiento =
      filtroVencimiento === 'TODOS' || estadoVencimiento(i.fechaVencimiento) === filtroVencimiento;
    return coincideBusqueda && coincideUnidad && coincideVencimiento;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      if (filtroUnidad !== 'TODOS') params.append('unidad', filtroUnidad);
      if (filtroVencimiento !== 'TODOS') params.append('vencimiento', filtroVencimiento);

      const queryString = params.toString();
      const url = `/insumos/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'ingredientes.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(err instanceof Error ? err.message : 'Error al exportar ingredientes a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda}"`);
    if (filtroUnidad !== 'TODOS') partes.push(`Unidad: ${filtroUnidad}`);
    if (filtroVencimiento !== 'TODOS') partes.push(`Vencimiento: ${filtroVencimiento}`);
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

  const {
    itemsPaginados: insumosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(insumosFiltrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Ingredientes</h1>
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
              + Agregar Ingrediente
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar ingrediente por nombre o lote..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroUnidad}
          onChange={(e) => setFiltroUnidad(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todas las unidades</option>
          <option value="KILOGRAMOS">Kilogramos</option>
          <option value="GRAMOS">Gramos</option>
          <option value="LITROS">Litros</option>
          <option value="MILILITROS">Mililitros</option>
          <option value="UNIDADES">Unidades</option>
        </select>

        <select
          value={filtroVencimiento}
          onChange={(e) => setFiltroVencimiento(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los vencimientos</option>
          <option value="VIGENTE">Vigentes</option>
          <option value="POR_VENCER">Por vencer (15 días)</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="SIN_VENCIMIENTO">Sin vencimiento</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Lote</th>
              <th>Stock</th>
              <th>Recibido</th>
              <th>Unidad</th>
              <th>Recepción</th>
              <th>Vencimiento</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando ingredientes...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroUnidad !== 'TODOS' || filtroVencimiento !== 'TODOS'
                    ? 'No se encontraron ingredientes que coincidan con los filtros.'
                    : 'No hay ingredientes registrados.'}
                </td>
              </tr>
            ) : (
              insumosPaginados.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                  <td>{i.lote}</td>
                  <td>{i.stock}</td>
                  <td>{i.cantRecibida}</td>
                  <td>{i.medida}</td>
                  <td>{formatDate(i.fechaRecepcion)}</td>
                  <td>{formatDate(i.fechaVencimiento)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onVerClick?.(i)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(i)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-eliminar"
                        title="Eliminar"
                        onClick={() => abrirConfirmacion(i)}
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
        etiqueta="ingredientes"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={insumosFiltrados.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="¿Eliminar ingrediente?"
        description={`¿Seguro que desea eliminar "${nombreAEliminar}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogAbierto(false);
          setIdAEliminar(null);
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