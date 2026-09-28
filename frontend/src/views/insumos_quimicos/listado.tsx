import React, { useEffect, useState } from 'react';
import type { InsumoQuimico } from './tipos';
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';

interface Props {
  onNuevo: () => void;
  onEditar: (insumo: InsumoQuimico) => void;
  onVerDetalle: (insumo: InsumoQuimico) => void;
}

export const ListadoInsumosQuimicos: React.FC<Props> = ({ onNuevo, onEditar, onVerDetalle }) => {
  const [insumos, setInsumos] = useState<InsumoQuimico[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const [quimicoAConfirmar, setQuimicoAConfirmar] = useState<InsumoQuimico | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState<boolean>(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos');
      if (!res.ok) throw new Error('Error al cargar insumos químicos');
      const data = await res.json();
      setInsumos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirConfirmacion = (insumo: InsumoQuimico) => {
    setQuimicoAConfirmar(insumo);
    setDialogAbierto(true);
  };

  const ejecutarToggle = async () => {
    if (!quimicoAConfirmar) return;
    try {
      await fetch(`http://localhost:8000/api/insumos-quimicos/${quimicoAConfirmar.id}/toggle`, { method: 'PATCH' });
      cargarDatos();
    } catch (err) {
      console.error(err);
    } finally {
      setDialogAbierto(false);
      setQuimicoAConfirmar(null);
    }
  };

  const insumosFiltrados = Array.isArray(insumos)
    ? insumos.filter((item) => {
        const coincideNombre = item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ?? false;
        const coincideTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
        const coincideEstado =
          filtroEstado === 'TODOS' ||
          (filtroEstado === 'ACTIVO' && item.activo) ||
          (filtroEstado === 'INACTIVO' && !item.activo);
        return coincideNombre && coincideTipo && coincideEstado;
      })
    : [];

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Insumos Químicos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <button onClick={onNuevo} className="btn-guardar">
          + Agregar Insumo Químico
        </button>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="DETERGENTE">Detergente</option>
          <option value="DESINFECTANTE">Desinfectante</option>
          <option value="DESENGRASANTE">Desengrasante</option>
          <option value="SANITIZANTE">Sanitizante</option>
          <option value="OTRO">Otro</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Stock Actual</th>
              <th>Unidad de Medida</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando insumos químicos...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS'
                    ? 'No se encontraron insumos químicos que coincidan con los filtros.'
                    : 'No hay insumos químicos registrados.'}
                </td>
              </tr>
            ) : (
              insumosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nombre}</td>
                  <td>{item.tipo}</td>
                  <td>{item.stock_actual}</td>
                  <td>{item.unidad_medida}</td>
                  <td>
                    <span className={`badge-status ${item.activo ? 'activo' : 'inactivo'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button className="btn-icon btn-ver" title="Ver Detalle" onClick={() => onVerDetalle(item)}>
                        👁
                      </button>
                      <button className="btn-icon btn-editar" title="Editar" onClick={() => onEditar(item)}>
                        ✎
                      </button>
                      <button
                        className={`btn-icon ${item.activo ? 'btn-eliminar' : 'btn-reactivar'}`}
                        title={item.activo ? 'Dar de baja' : 'Reactivar'}
                        onClick={() => abrirConfirmacion(item)}
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

      <ConfirmAlertDialog
        open={dialogAbierto}
        title={quimicoAConfirmar?.activo ? '¿Dar de baja insumo químico?' : '¿Reactivar insumo químico?'}
        description={
          quimicoAConfirmar?.activo
            ? `¿Estás seguro de que deseas desactivar el insumo "${quimicoAConfirmar?.nombre}"?`
            : `¿Estás seguro de que deseas reactivar el insumo "${quimicoAConfirmar?.nombre}"?`
        }
        confirmText={quimicoAConfirmar?.activo ? 'Confirmar Baja' : 'Confirmar Reactivación'}
        cancelText="Cancelar"
        isDestructive={Boolean(quimicoAConfirmar?.activo)}
        onConfirm={ejecutarToggle}
        onCancel={() => {
          setDialogAbierto(false);
          setQuimicoAConfirmar(null);
        }}
      />
    </div>
  );
};
