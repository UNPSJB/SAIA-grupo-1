import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import { mensajeDeError } from '../incidentes/tipos';
import { formatearFecha, obtenerFechaLocalHoy } from './tipos';
import type { LoteProduccion } from './tipos';
import { useProductos } from './useProductos';
import '../../styles/formularioAlta.css';
import '../../styles/checklist.css';
import '../../styles/produccion.css';

interface HistorialLotesProps {
  onVerLote: (loteId: number) => void;
  /** Solo para el personal operativo: un administrador puro consulta pero no registra */
  onRegistrarClick?: () => void;
}

interface Filtros {
  producto: string;
  desde: string;
  hasta: string;
}

const SIN_FILTROS: Filtros = { producto: '', desde: '', hasta: '' };
const COLUMNAS = 8;

/** Historial de lotes producidos: trazabilidad hacia atrás por producto y rango de fechas. */
export const HistorialLotes: React.FC<HistorialLotesProps> = ({ onVerLote, onRegistrarClick }) => {
  const { productos } = useProductos();
  const [lotes, setLotes] = useState<LoteProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const {
    itemsPaginados: lotesPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(lotes);

  // filtros con los que se pidió el listado (los del formulario se aplican recién al filtrar)
  const [consulta, setConsulta] = useState<Filtros>(SIN_FILTROS);

  const hayFiltros = Boolean(filtros.producto || filtros.desde || filtros.hasta);

  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams();
    if (consulta.producto) params.append('producto_id', consulta.producto);
    if (consulta.desde) params.append('desde', consulta.desde);
    if (consulta.hasta) params.append('hasta', consulta.hasta);
    const query = params.toString() ? `?${params.toString()}` : '';

    apiFetch(`/lotes/${query}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(mensajeDeError(errorData.detail, 'No se pudo cargar el historial de lotes.'));
        }
        const data: LoteProduccion[] = await res.json();
        if (!cancelado) setLotes(data);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setLotes([]);
        setErrorDialog({
          title: 'Atención',
          message: err instanceof Error ? err.message : 'No se pudo conectar con el servidor.',
        });
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [consulta]);

  // Misma regla que el backend: no se consulta con un rango al revés
  const aplicar = (nuevos: Filtros) => {
    if (nuevos.desde && nuevos.hasta && nuevos.desde > nuevos.hasta) {
      setErrorDialog({
        title: 'Rango de fechas inválido',
        message: "La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.",
      });
      return;
    }
    setLoading(true);
    setConsulta({ ...nuevos }); // copia nueva: filtrar dos veces lo mismo también vuelve a pedir
  };

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    aplicar(filtros);
  };

  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevos = { ...filtros, producto: e.target.value };
    setFiltros(nuevos);
    aplicar(nuevos);
  };

  const handleLimpiar = () => {
    setFiltros(SIN_FILTROS);
    aplicar(SIN_FILTROS);
  };

  const hoy = obtenerFechaLocalHoy();

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Historial de lotes</h1>
          <div className="subtitulo">Producción</div>
        </div>
        {onRegistrarClick && (
          <button type="button" className="btn-agregar" onClick={onRegistrarClick}>
            + Registrar lote
          </button>
        )}
      </div>

      <form onSubmit={handleFiltrar} className="filtros-historial">
        <div className="filtros-rango-campos">
          <div className="filtro-campo-grupo">
            <label htmlFor="filtro-producto">Producto:</label>
            <select id="filtro-producto" value={filtros.producto} onChange={handleProductoChange}>
              <option value="">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.activo ? p.nombre : `${p.nombre} (dado de baja)`}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-campo-grupo">
            <label htmlFor="lotes-desde">Desde:</label>
            <input
              id="lotes-desde"
              type="date"
              max={hoy}
              value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            />
          </div>
          <div className="filtro-campo-grupo">
            <label htmlFor="lotes-hasta">Hasta:</label>
            <input
              id="lotes-hasta"
              type="date"
              max={hoy}
              value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            />
          </div>
        </div>

        <div className="filtros-acciones">
          <button type="submit" className="btn-filtrar" title="Filtrar historial">
            🔍 Filtrar
          </button>
          {hayFiltros && (
            <button type="button" onClick={handleLimpiar} className="btn-limpiar-filtro" title="Limpiar filtros">
              ✕ Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Responsable</th>
              <th>Insumos</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNAS} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Cargando historial de lotes...
                </td>
              </tr>
            ) : lotes.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  {hayFiltros
                    ? 'No se encontraron lotes con los filtros seleccionados.'
                    : 'Todavía no hay lotes registrados.'}
                </td>
              </tr>
            ) : (
              lotesPaginados.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.codigo}</td>
                  <td>{formatearFecha(l.fecha)}</td>
                  <td>{l.producto.nombre}</td>
                  <td>
                    {l.cantidad} {l.producto.unidadMedida}
                  </td>
                  <td>{l.nombre_responsable}</td>
                  <td>{l.insumos.length}</td>
                  <td>
                    <span className={`badge-status ${l.editable ? 'activo' : 'cerrado'}`}>
                      {l.editable ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalle del lote"
                        aria-label={`Ver lote ${l.codigo}`}
                        onClick={() => onVerLote(l.id)}
                      >
                        👁
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
        etiqueta="lotes"
      />

      <ErrorAlertDialog
        open={Boolean(errorDialog)}
        title={errorDialog?.title || ''}
        description={errorDialog?.message || ''}
        onClose={() => setErrorDialog(null)}
      />
    </div>
  );
};
