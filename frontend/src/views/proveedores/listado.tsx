import React, { useEffect, useState } from 'react';
import type { Proveedor } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';

interface ListadoProveedoresProps {
  onNuevoClick?: () => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoProveedores: React.FC<ListadoProveedoresProps> = ({
  onNuevoClick,
  onEditarClick,
}) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [proveedorAEliminar, setProveedorAEliminar] = useState<Proveedor | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!soloActivos) params.append('solo_activos', 'false');
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/proveedores/${query}`);
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
      } else {
        setProveedores([]);
      }
    } catch {
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, [soloActivos, busqueda]);

  const abrirConfirmacion = (prov: Proveedor) => {
    setErrorMsg(null);
    setProveedorAEliminar(prov);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!proveedorAEliminar) return;
    try {
      const res = await apiFetch(`/proveedores/${proveedorAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProveedores((prev) =>
          soloActivos
            ? prev.filter((p) => p.id !== proveedorAEliminar.id)
            : prev.map((p) => (p.id === proveedorAEliminar.id ? { ...p, activo: false } : p))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'No se pudo eliminar el proveedor.');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar el proveedor.');
    } finally {
      setDialogAbierto(false);
      setProveedorAEliminar(null);
    }
  };

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      if (!soloActivos) params.append('solo_activos', 'false');

      const queryString = params.toString();
      const url = `/proveedores/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'proveedores.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al exportar proveedores a CSV.');
    } finally {
      setExportando(false);
    }
  };

  const {
    itemsPaginados: proveedoresPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(proveedores);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Proveedores</h1>
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
              + Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}

      <div className="filtros-top-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar proveedor por nombre, CUIT, contacto..."
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
              <th>Razón Social</th>
              <th>CUIT</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando proveedores...
                </td>
              </tr>
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda
                    ? 'No se encontraron proveedores que coincidan con la búsqueda.'
                    : 'No hay proveedores registrados.'}
                </td>
              </tr>
            ) : (
              proveedoresPaginados.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td>{p.cuit || '-'}</td>
                  <td>{p.contacto || '-'}</td>
                  <td>{p.telefono || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: p.activo ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: p.activo ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-editar"
                        title="Editar proveedor"
                        onClick={() => onEditarClick?.(p.id)}
                      >
                        ✎
                      </button>
                      {p.activo && (
                        <button
                          className="btn-icon btn-eliminar"
                          title="Dar de baja proveedor"
                          onClick={() => abrirConfirmacion(p)}
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
        title="Dar de baja proveedor"
        description={`¿Estás seguro de que deseas dar de baja al proveedor "${proveedorAEliminar?.nombre}"? Esta acción puede deshacerse editando el estado del proveedor.`}
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
