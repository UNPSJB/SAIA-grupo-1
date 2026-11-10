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
}) => {
  const [grupos, setGrupos] = useState<InsumoAgrupadoPorTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [mostrarHistorialAgotados, setMostrarHistorialAgotados] = useState(false);
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
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 500,
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
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
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
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
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
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
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
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Inventario de Insumos</h1>
          <div className="subtitulo">Vista agrupada por tipo, control FEFO y semáforo de vencimiento</div>
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
              + Recepción de Insumo
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por tipo, nombre específico, lote o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
          style={{ minWidth: '320px' }}
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

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={mostrarHistorialAgotados}
            onChange={(e) => setMostrarHistorialAgotados(e.target.checked)}
          />
          Mostrar historial de lotes agotados (stock 0)
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando inventario de insumos...</div>
      ) : gruposFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          No se encontraron insumos que coincidan con los filtros aplicados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          {gruposFiltrados.map((grupo) => {
            const abierto = tiposAbiertos[grupo.tipo_id] ?? true;
            return (
              <div
                key={grupo.tipo_id}
                style={{
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--code-bg, rgba(255, 255, 255, 0.02))',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleTipo(grupo.tipo_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: abierto ? '1px solid var(--border, #334155)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)' }}>
                      {abierto ? '▼' : '▶'}
                    </span>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{grupo.nombre}</span>
                      {grupo.descripcion && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginLeft: '10px' }}>
                          — {grupo.descripcion}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {grupo.tiene_vencidos && (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#dc2626',
                        }}
                      >
                        ⚠️ Lote Vencido
                      </span>
                    )}

                    {grupo.tiene_proximos && (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(234, 179, 8, 0.15)',
                          color: '#ca8a04',
                        }}
                      >
                        ⏳ Próximo a Vencer
                      </span>
                    )}

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Stock Total: </span>
                      <span style={{ fontSize: '16px', fontWeight: 700 }}>
                        {grupo.stock_total} {grupo.unidadMedida}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginLeft: '8px' }}>
                        ({grupo.lotes.length} {grupo.lotes.length === 1 ? 'lote activo' : 'lotes activos'})
                      </span>
                    </div>
                  </div>
                </div>

                {abierto && (
                  <div style={{ padding: '16px' }}>
                    {grupo.lotes.length === 0 ? (
                      <p style={{ margin: '8px 0', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                        No hay lotes con stock disponible en este momento.
                      </p>
                    ) : (
                      <div className="tabla-wrapper">
                        <table className="tabla-custom">
                          <thead>
                            <tr>
                              <th>Lote</th>
                              <th>Nombre Específico</th>
                              <th>Proveedor</th>
                              <th>Fecha Recepción</th>
                              <th>Fecha Vencimiento</th>
                              <th>Cant. Recibida</th>
                              <th>Stock Disponible</th>
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
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #dc2626',
                                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                          color: '#dc2626',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                        }}
                                        title="Desechar stock restante de lote vencido"
                                        onClick={() => abrirConfirmacionDesechar(lote)}
                                      >
                                        Desechar
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

                    {mostrarHistorialAgotados && grupo.lotes_agotados.length > 0 && (
                      <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border, #334155)', paddingTop: '14px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
                          Historial de lotes agotados (Stock 0)
                        </h4>
                        <div className="tabla-wrapper">
                          <table className="tabla-custom">
                            <thead>
                              <tr>
                                <th>Lote</th>
                                <th>Nombre Específico</th>
                                <th>Proveedor</th>
                                <th>Fecha Recepción</th>
                                <th>Fecha Vencimiento</th>
                                <th>Cant. Recibida</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th className="acciones-col">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grupo.lotes_agotados.map((lote) => (
                                <tr key={lote.id} style={{ opacity: 0.7 }}>
                                  <td style={{ fontWeight: 500 }}>{lote.lote}</td>
                                  <td>{lote.nombre}</td>
                                  <td>{lote.proveedor_nombre || '-'}</td>
                                  <td>{formatDate(lote.fechaRecepcion.toString())}</td>
                                  <td>{formatDate(lote.fechaVencimiento?.toString())}</td>
                                  <td>
                                    {lote.cantRecibida} {lote.medida}
                                  </td>
                                  <td>0 {lote.medida}</td>
                                  <td>{renderBadge(lote.estadoVencimiento, true)}</td>
                                  <td className="acciones-col">
                                    <div className="acciones-btns">
                                      <button
                                        className="btn-icon btn-editar"
                                        title="Ver trazabilidad del lote"
                                        onClick={() => onVerClick?.(transformarParaAcciones(lote))}
                                      >
                                        👁
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
        description={`El lote "${loteADesechar?.lote}" de "${loteADesechar?.nombre}" está vencido y cuenta con un stock remanente de ${loteADesechar?.stock} ${loteADesechar?.medida}. ¿Deseas desechar este stock remanente llevando su cantidad a 0 para impedir su uso en producción?`}
        confirmText="Confirmar y Llevar a 0"
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
