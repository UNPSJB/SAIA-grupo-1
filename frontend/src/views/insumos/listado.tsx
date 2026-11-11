import React, { useEffect, useState } from 'react';
import type { InsumoAgrupadoPorTipo, LoteInsumoItem, InsumoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoInsumosProps {
  onNuevoClick?: () => void;
  onVerClick?: (insumo: InsumoConId) => void;
  onEditarClick?: (insumo: InsumoConId) => void;
  onVerTipoClick?: (tipoId: number) => void;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No perecedero";
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

export const ListadoInsumos: React.FC<ListadoInsumosProps> = ({
  onNuevoClick,
  onVerClick,
  onEditarClick,
  onVerTipoClick,
}) => {
  const [grupos, setGrupos] = useState<InsumoAgrupadoPorTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [tiposAbiertos, setTiposAbiertos] = useState<Record<number, boolean>>({});

  const [loteADesechar, setLoteADesechar] = useState<LoteInsumoItem | null>(null);
  const [dialogDesecharAbierto, setDialogDesecharAbierto] = useState(false);

  const [idAEliminar, setIdAEliminar] = useState<number | null>(null);
  const [nombreAEliminar, setNombreAEliminar] = useState<string>('');
  const [dialogEliminarAbierto, setDialogEliminarAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const cargarInsumosAgrupados = async () => {
    try {
      setLoading(true);
      let res = await apiFetch('/insumos/agrupados');
      if (res.status === 403 || res.status === 404) {
        res = await apiFetch('/insumos-operador/agrupados');
      }
      if (res.ok) {
        const data: InsumoAgrupadoPorTipo[] = await res.json();
        setGrupos(data);

        setTiposAbiertos((prev) => {
          const inicial: Record<number, boolean> = { ...prev };
          data.forEach((g) => {
            if (inicial[g.tipo_id] === undefined) {
              inicial[g.tipo_id] = true;
            }
          });
          return inicial;
        });
      } else {
        setGrupos([]);
      }
    } catch {
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInsumosAgrupados();
  }, []);

  const toggleTipo = (tipoId: number) => {
    setTiposAbiertos((prev) => ({
      ...prev,
      [tipoId]: !prev[tipoId],
    }));
  };

  const abrirConfirmacionEliminar = (lote: LoteInsumoItem) => {
    setIdAEliminar(lote.id);
    setNombreAEliminar(`${lote.nombre} (Lote ${lote.lote})`);
    setDialogEliminarAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!idAEliminar) return;
    try {
      const res = await apiFetch(`/insumos/${idAEliminar}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarInsumosAgrupados();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || 'No se pudo dar de baja el insumo.');
      }
    } catch {
      setErrorDialogMsg('Error de conexión al eliminar el insumo.');
    } finally {
      setDialogEliminarAbierto(false);
      setIdAEliminar(null);
    }
  };

  const abrirConfirmacionDesechar = (lote: LoteInsumoItem) => {
    setLoteADesechar(lote);
    setDialogDesecharAbierto(true);
  };

  const ejecutarDesechar = async () => {
    if (!loteADesechar) return;
    try {
      let res = await apiFetch(`/insumos/${loteADesechar.id}/desechar`, { method: 'POST' });
      if (res.status === 403 || res.status === 404) {
        res = await apiFetch(`/insumos-operador/${loteADesechar.id}/desechar`, { method: 'POST' });
      }
      if (res.ok) {
        await cargarInsumosAgrupados();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || 'No se pudo desechar el lote de insumo.');
      }
    } catch {
      setErrorDialogMsg('Error de conexión al desechar el insumo.');
    } finally {
      setDialogDesecharAbierto(false);
      setLoteADesechar(null);
    }
  };

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      await descargarCSV('/insumos/exportar-csv', 'inventario_insumos.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(err instanceof Error ? err.message : 'Error al exportar inventario a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const renderBadge = (estado: string, esAgotado: boolean = false) => {
    if (esAgotado) {
      return (
        <span
          style={{
            padding: '0.15rem 0.45rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            backgroundColor: 'rgba(100, 116, 139, 0.15)',
            color: '#64748b',
          }}
        >
          Agotado
        </span>
      );
    }

    switch (estado) {
      case 'VENCIDO':
        return (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'inline-block',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#dc2626',
            }}
          >
            Vencido
          </span>
        );
      case 'PROXIMO_A_VENCER':
        return (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'inline-block',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#ca8a04',
            }}
          >
            Próximo a Vencer
          </span>
        );
      case 'VIGENTE':
      default:
        return (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'inline-block',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a',
            }}
          >
            Vigente
          </span>
        );
    }
  };

  const transformarParaAcciones = (lote: LoteInsumoItem): InsumoConId => ({
    id: lote.id,
    nombre: lote.nombre,
    lote: lote.lote,
    fechaRecepcion: lote.fechaRecepcion.toString(),
    fechaVencimiento: lote.fechaVencimiento ? lote.fechaVencimiento.toString() : null,
    cantRecibida: lote.cantRecibida,
    stock: lote.stock,
    medida: lote.medida,
    proveedor_nombre: lote.proveedor_nombre,
    estadoVencimiento: lote.estadoVencimiento,
    activo: lote.activo,
  });

  const gruposFiltrados = grupos.filter((g) => {
    const matchBusqueda =
      !busqueda.trim() ||
      g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.lotes.some(
        (l) =>
          l.lote.toLowerCase().includes(busqueda.toLowerCase()) ||
          l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (l.proveedor_nombre && l.proveedor_nombre.toLowerCase().includes(busqueda.toLowerCase()))
      );

    if (!matchBusqueda) return false;

    if (filtroEstado === 'VENCIDOS') return g.tiene_vencidos;
    if (filtroEstado === 'PROXIMOS') return g.tiene_proximos;
    return true;
  });

  return (
    <div className="modulo-container modulo-insumos-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Inventario de Insumos</h1>
          <div className="subtitulo">Listado agrupado por tipo de insumo</div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
              + Recepción de Insumos
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar por tipo, nombre, lote o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
          style={{ width: 'auto' }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDOS">Con lotes vencidos</option>
          <option value="PROXIMOS">Con lotes próximos a vencer</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando inventario de insumos...</div>
      ) : gruposFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          No se encontraron insumos que coincidan con los filtros aplicados.
        </div>
      ) : (
        <div className="insumos-grupos-lista">
          {gruposFiltrados.map((grupo) => {
            const abierto = tiposAbiertos[grupo.tipo_id] ?? true;
            return (
              <div key={grupo.tipo_id} className="insumos-grupo-card">
                <div
                  onClick={() => toggleTipo(grupo.tipo_id)}
                  className="insumos-grupo-header"
                  style={{
                    borderBottom: abierto ? '1px solid var(--border, #334155)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                      {abierto ? '▼' : '▶'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{grupo.nombre}</span>
                      {grupo.descripcion && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '0.5rem' }}>
                          — {grupo.descripcion}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Stock Total: </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                        {grupo.stock_total} {grupo.unidadMedida}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '0.45rem' }}>
                        ({grupo.lotes.length} {grupo.lotes.length === 1 ? 'lote activo' : 'lotes activos'})
                      </span>
                    </div>
                    {onVerTipoClick && (
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalle e historial del tipo de insumo"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerTipoClick(grupo.tipo_id);
                        }}
                      >
                        👁
                      </button>
                    )}
                  </div>
                </div>

                {abierto && (
                  <div className="insumos-grupo-body">
                    {grupo.lotes.length === 0 ? (
                      <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                        No hay lotes con stock disponible en este momento.
                      </p>
                    ) : (
                      <div className="tabla-wrapper">
                        <table className="tabla-custom tabla-insumos">
                          <thead>
                            <tr>
                              <th>Lote</th>
                              <th>Nombre</th>
                              <th>Proveedor</th>
                              <th>Recepción</th>
                              <th>Vencimiento</th>
                              <th>Recibido</th>
                              <th>Stock</th>
                              <th>Estado</th>
                              <th className="acciones-col">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.lotes.map((lote) => (
                              <tr key={lote.id}>
                                <td style={{ fontWeight: 600 }}>{lote.lote}</td>
                                <td>{lote.nombre}</td>
                                <td>{lote.proveedor_nombre || '-'}</td>
                                <td>{formatDate(lote.fechaRecepcion.toString())}</td>
                                <td>{formatDate(lote.fechaVencimiento?.toString())}</td>
                                <td>
                                  {lote.cantRecibida} {lote.medida}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {lote.stock} {lote.medida}
                                </td>
                                <td>{renderBadge(lote.estadoVencimiento)}</td>
                                <td className="acciones-col">
                                  <div className="acciones-btns">
                                    <button
                                      className="btn-icon btn-editar"
                                      title="Ver trazabilidad del lote"
                                      onClick={() => onVerClick?.(transformarParaAcciones(lote))}
                                    >
                                      👁
                                    </button>
                                    <button
                                      className="btn-icon btn-editar"
                                      title="Editar lote"
                                      onClick={() => onEditarClick?.(transformarParaAcciones(lote))}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      className="btn-icon btn-eliminar"
                                      title="Dar de baja lote"
                                      onClick={() => abrirConfirmacionEliminar(lote)}
                                    >
                                      🗑
                                    </button>
                                    {lote.estadoVencimiento === 'VENCIDO' && lote.stock > 0 && (
                                      <button
                                        type="button"
                                        className="btn-icon btn-eliminar"
                                        title="Desechar stock restante de lote vencido"
                                        onClick={() => abrirConfirmacionDesechar(lote)}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}


                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmAlertDialog
        open={dialogEliminarAbierto}
        title="Dar de baja insumo"
        description={`¿Estás seguro de que deseas dar de baja el ingrediente "${nombreAEliminar}"? Los lotes de producción mantendrán su trazabilidad histórica.`}
        confirmText="Dar de baja"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => setDialogEliminarAbierto(false)}
      />

      <ConfirmAlertDialog
        open={dialogDesecharAbierto}
        title="Confirmar Descarte de Lote Vencido"
        description={`El lote "${loteADesechar?.lote}" de "${loteADesechar?.nombre}" está vencido y cuenta con un stock remanente de ${loteADesechar?.stock} ${loteADesechar?.medida}. ¿Deseas desechar este stock remanente llevando su cantidad a 0?`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarDesechar}
        onCancel={() => setDialogDesecharAbierto(false)}
      />

      <ErrorAlertDialog
        open={errorDialogMsg !== null}
        title="Error"
        description={errorDialogMsg ?? ''}
        onClose={() => setErrorDialogMsg(null)}
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={grupos.length}
        filtrosAplicados={busqueda.trim() ? `Búsqueda: "${busqueda}"` : undefined}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};
