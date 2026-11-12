import React, { useEffect, useState } from 'react';
import type { Proveedor } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
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
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [proveedorAConfirmar, setProveedorAConfirmar] = useState<Proveedor | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/proveedores/?solo_activos=false');
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
  }, []);

  const abrirConfirmacion = (prov: Proveedor) => {
    setProveedorAConfirmar(prov);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!proveedorAConfirmar) return;
    const esActivo = proveedorAConfirmar.activo;
    const accion = esActivo ? 'dar de baja' : 'restaurar';
    try {
      const url = esActivo
        ? `/proveedores/${proveedorAConfirmar.id}`
        : `/proveedores/${proveedorAConfirmar.id}/restaurar`;
      const method = esActivo ? 'DELETE' : 'POST';
      const res = await apiFetch(url, { method });

      if (res.ok) {
        setProveedores((prev) =>
          prev.map((p) =>
            p.id === proveedorAConfirmar.id ? { ...p, activo: !esActivo } : p
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || `No se pudo ${accion} el proveedor.`);
      }
    } catch {
      setErrorDialogMsg(`Error de conexión al ${accion} el proveedor.`);
    } finally {
      setDialogAbierto(false);
      setProveedorAConfirmar(null);
    }
  };

  const proveedoresFiltrados = proveedores.filter((p) => {
    const term = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !term ||
      p.nombre.toLowerCase().includes(term) ||
      (p.cuit && p.cuit.toLowerCase().includes(term)) ||
      (p.contacto && p.contacto.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term));

    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'activo' && p.activo) ||
      (filtroEstado === 'inactivo' && !p.activo);

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
      const url = `/proveedores/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, 'proveedores.csv');
      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorDialogMsg(err instanceof Error ? err.message : 'Error al exportar proveedores a CSV.');
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
  } = usePaginacion(proveedoresFiltrados);

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

      <div className="filtros-top-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar proveedor por nombre, CUIT, contacto..."
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
            ) : proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroEstado !== 'TODOS'
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
                    <span className={`badge-status ${p.activo ? 'activo' : 'inactivo'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(p.id)}
                      >
                        ✎
                      </button>
                      <button
                        className={`btn-icon ${p.activo ? 'btn-eliminar' : 'btn-reactivar'}`}
                        title={p.activo ? 'Dar de baja' : 'Restaurar'}
                        onClick={() => abrirConfirmacion(p)}
                      >
                        {p.activo ? '🗑' : '🔄'}
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
          etiqueta="proveedores"
        />
      )}

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={proveedorAConfirmar?.activo ? '¿Dar de baja proveedor?' : '¿Restaurar proveedor?'}
        description={
          proveedorAConfirmar?.activo
            ? `¿Estás seguro de que deseas dar de baja al proveedor "${proveedorAConfirmar?.nombre}"?`
            : `¿Estás seguro de que deseas restaurar al proveedor "${proveedorAConfirmar?.nombre}"?`
        }
        confirmText={proveedorAConfirmar?.activo ? 'Confirmar Baja' : 'Confirmar Restauración'}
        cancelText="Cancelar"
        isDestructive={Boolean(proveedorAConfirmar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setProveedorAConfirmar(null);
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
